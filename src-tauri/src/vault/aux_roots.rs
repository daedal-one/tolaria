//! Auxiliary vault roots (e.g. forge-spec `.specs/` directories) mounted
//! alongside the primary vault for read-only navigation. Entries from these
//! roots are tagged with a `root_label` so the frontend can group them in
//! dedicated sidebar sections.
//!
//! Configuration lives in `<vault>/config/forge-spec.md`. The file's YAML
//! frontmatter (or first fenced block) is parsed for a `projects:` list:
//!
//! ```yaml
//! projects:
//!   - path: "../.specs"
//!     label: "Auth Specs"
//! ```
//!
//! Paths are resolved relative to the vault root. Missing directories are
//! skipped silently (forge-spec is opt-in).

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use walkdir::WalkDir;

use super::{is_md_file, parse_md_file, parse_non_md_file, VaultEntry};

const CONFIG_RELATIVE_PATH: &str = "config/forge-spec.md";

/// One configured auxiliary root: a label + an absolute, canonicalized path.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuxRoot {
    pub label: String,
    pub path: PathBuf,
}

/// Parse `<vault>/config/forge-spec.md` and resolve each configured project
/// path against the vault root. Missing files / missing directories yield
/// an empty list.
pub fn load_aux_roots(vault_path: &Path) -> Vec<AuxRoot> {
    let config_path = vault_path.join(CONFIG_RELATIVE_PATH);
    let content = match std::fs::read_to_string(&config_path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    parse_projects(&content)
        .into_iter()
        .filter_map(|(label, raw_path)| {
            let resolved = if Path::new(&raw_path).is_absolute() {
                PathBuf::from(&raw_path)
            } else {
                vault_path.join(&raw_path)
            };
            let canonical = resolved.canonicalize().ok()?;
            if !canonical.is_dir() {
                return None;
            }
            Some(AuxRoot {
                label,
                path: canonical,
            })
        })
        .collect()
}

/// Minimal projects-list parser. Walks the file line by line and collects
/// `- path: ...` / `label: ...` pairs without pulling in a full YAML parser
/// (the file mixes prose with structured data, so we just extract what we
/// need). Tolerant of quoted and unquoted values.
fn parse_projects(content: &str) -> Vec<(String, String)> {
    let mut projects: Vec<(String, String)> = Vec::new();
    let mut current_path: Option<String> = None;
    let mut current_label: Option<String> = None;

    for raw_line in content.lines() {
        let line = raw_line.trim_start();
        if let Some(rest) = line.strip_prefix("- ") {
            flush_project(&mut projects, &mut current_path, &mut current_label);
            apply_field(rest.trim(), &mut current_path, &mut current_label);
        } else if line.starts_with("path:") || line.starts_with("label:") {
            apply_field(line, &mut current_path, &mut current_label);
        }
    }
    flush_project(&mut projects, &mut current_path, &mut current_label);
    projects
}

fn apply_field(line: &str, path: &mut Option<String>, label: &mut Option<String>) {
    if let Some(value) = line.strip_prefix("path:") {
        *path = Some(strip_quotes(value.trim()).to_string());
    } else if let Some(value) = line.strip_prefix("label:") {
        *label = Some(strip_quotes(value.trim()).to_string());
    }
}

fn flush_project(
    out: &mut Vec<(String, String)>,
    path: &mut Option<String>,
    label: &mut Option<String>,
) {
    if let Some(p) = path.take() {
        let l = label.take().unwrap_or_else(|| derive_label(&p));
        out.push((l, p));
    } else {
        // Drop dangling label-only blocks.
        let _ = label.take();
    }
}

fn strip_quotes(s: &str) -> &str {
    s.trim_matches(|c| c == '"' || c == '\'')
}

fn derive_label(path: &str) -> String {
    Path::new(path)
        .file_name()
        .map(|f| f.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string())
}

/// Scan one auxiliary root and return tagged entries. Unlike the primary
/// vault scanner, this does not consult git for dates and does not cache.
///
/// **Hidden-directory handling**: the aux root path itself may start with
/// `.` (e.g. `.specs`). We treat the root as depth-0 (always included) and
/// only skip subdirectories whose names start with `.`.
pub fn scan_aux_root(root: &AuxRoot) -> Vec<VaultEntry> {
    let mut entries: Vec<VaultEntry> = Vec::new();
    let walker = WalkDir::new(&root.path)
        .follow_links(true)
        .into_iter()
        .filter_entry(|e| {
            if e.file_type().is_dir() && e.depth() > 0 {
                let name = e.file_name().to_string_lossy();
                return !name.starts_with('.');
            }
            true
        });

    for entry in walker.filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let fname = entry.file_name().to_string_lossy();
        if fname.starts_with('.') {
            continue;
        }
        let parsed = if is_md_file(path) {
            parse_md_file(path, None)
        } else {
            parse_non_md_file(path, None)
        };
        if let Ok(mut ve) = parsed {
            ve.root_label = Some(root.label.clone());
            entries.push(ve);
        }
    }
    entries
}

/// Scan every configured auxiliary root for the given vault and return the
/// merged tagged entries.
pub fn scan_all_aux_roots(vault_path: &Path) -> Vec<VaultEntry> {
    load_aux_roots(vault_path)
        .iter()
        .flat_map(scan_aux_root)
        .collect()
}

/// Return the set of canonicalized aux root paths for the given vault.
/// Used by the path-boundary check to whitelist reads into aux roots.
pub fn aux_root_canonical_paths(vault_path: &Path) -> Vec<PathBuf> {
    load_aux_roots(vault_path)
        .into_iter()
        .map(|r| r.path)
        .collect()
}

/// Build a map of aux-root canonical paths → label. Used when classifying
/// an arbitrary file path during single-entry reload.
pub fn aux_root_label_for(path: &Path, vault_path: &Path) -> Option<String> {
    let canonical = path.canonicalize().ok()?;
    for root in load_aux_roots(vault_path) {
        if canonical.starts_with(&root.path) {
            return Some(root.label);
        }
    }
    None
}

#[allow(dead_code)]
fn label_index(roots: &[AuxRoot]) -> HashMap<&Path, &str> {
    roots.iter().map(|r| (r.path.as_path(), r.label.as_str())).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn parses_projects_block() {
        let yaml = r#"
projects:
  - path: "../specs"
    label: "Auth Specs"
  - path: ./other-specs
    label: 'Other'
"#;
        assert_eq!(
            parse_projects(yaml),
            vec![
                ("Auth Specs".to_string(), "../specs".to_string()),
                ("Other".to_string(), "./other-specs".to_string()),
            ]
        );
    }

    #[test]
    fn parses_path_only_entry_derives_label() {
        let yaml = "projects:\n  - path: ../foo\n";
        assert_eq!(parse_projects(yaml), vec![("foo".to_string(), "../foo".to_string())]);
    }

    #[test]
    fn missing_config_yields_empty() {
        let dir = TempDir::new().unwrap();
        assert!(load_aux_roots(dir.path()).is_empty());
    }

    #[test]
    fn load_aux_roots_resolves_relative_paths() {
        let dir = TempDir::new().unwrap();
        let vault = dir.path().join("vault");
        let specs = dir.path().join("specs");
        fs::create_dir_all(vault.join("config")).unwrap();
        fs::create_dir_all(&specs).unwrap();
        fs::write(
            vault.join(CONFIG_RELATIVE_PATH),
            "projects:\n  - path: ../specs\n    label: My Specs\n",
        )
        .unwrap();

        let roots = load_aux_roots(&vault);
        assert_eq!(roots.len(), 1);
        assert_eq!(roots[0].label, "My Specs");
        assert_eq!(roots[0].path, specs.canonicalize().unwrap());
    }

    #[test]
    fn scan_aux_root_tags_markdown_entries() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().join("specs");
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("a.md"), "---\nid: REQ:foo/bar\n---\n# A\n").unwrap();
        fs::write(root.join("b.md"), "# B\n").unwrap();

        let aux = AuxRoot {
            label: "Specs".to_string(),
            path: root.canonicalize().unwrap(),
        };
        let entries = scan_aux_root(&aux);
        assert_eq!(entries.len(), 2);
        for entry in &entries {
            assert_eq!(entry.root_label.as_deref(), Some("Specs"));
        }
    }

    #[test]
    fn scan_aux_root_skips_hidden_subdirs() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().join("specs");
        fs::create_dir_all(root.join(".cache")).unwrap();
        fs::write(root.join(".cache").join("c.md"), "# Cached\n").unwrap();
        fs::write(root.join("a.md"), "# A\n").unwrap();
        let aux = AuxRoot {
            label: "Specs".to_string(),
            path: root.canonicalize().unwrap(),
        };
        let entries = scan_aux_root(&aux);
        assert_eq!(entries.len(), 1);
    }

    #[test]
    fn aux_root_label_for_classifies_path() {
        let dir = TempDir::new().unwrap();
        let vault = dir.path().join("vault");
        let specs = dir.path().join("specs");
        fs::create_dir_all(vault.join("config")).unwrap();
        fs::create_dir_all(&specs).unwrap();
        fs::write(
            vault.join(CONFIG_RELATIVE_PATH),
            "projects:\n  - path: ../specs\n    label: My Specs\n",
        )
        .unwrap();
        let f = specs.join("x.md");
        fs::write(&f, "# X\n").unwrap();

        assert_eq!(
            aux_root_label_for(&f, &vault).as_deref(),
            Some("My Specs"),
        );
        assert!(aux_root_label_for(&vault.join("note.md"), &vault).is_none());
    }
}
