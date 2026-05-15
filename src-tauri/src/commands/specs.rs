use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::vault::aux_roots::load_aux_roots;

use super::expand_tilde;

// ── Data transfer types ────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct AuxRootEntry {
    pub label: String,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpecSummary {
    pub id: String,
    pub entity_type: String,
    pub status: String,
    pub level: Option<String>,
    pub summary: Option<String>,
    pub version: String,
    pub owners: Vec<String>,
    pub progress: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpecFull {
    pub id: String,
    pub entity_type: String,
    pub status: String,
    pub level: Option<String>,
    pub summary: Option<String>,
    pub version: String,
    pub owners: Vec<String>,
    pub progress: Option<String>,
    pub body: String,
    pub source_path: String,
    pub refines: Vec<String>,
    pub related: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub entity_type: String,
    pub summary: Option<String>,
    pub status: String,
    pub level: Option<String>,
    pub progress: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphEdge {
    pub from: String,
    pub to: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CoverageEntry {
    pub clause_id: String,
    pub clause_text: String,
    pub children: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LintDiagnostic {
    pub code: String,
    pub severity: String,
    pub message: String,
    pub file: String,
    pub line: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryEvent {
    pub sha: String,
    pub kind: String,
    pub date: String,
    pub author: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskEntry {
    pub id: String,
    pub summary: Option<String>,
    pub progress: String,
    pub assignee: Option<String>,
    pub eta: Option<String>,
    pub blocked_by: Vec<String>,
}

// ── Helper to convert spec-cli types to DTOs ───────────────────────

fn doc_to_summary(doc: &spec_cli::model::document::SpecDocument) -> SpecSummary {
    use spec_cli::model::frontmatter::TypeSpecificFields;

    let (level, progress) = match &doc.type_fields {
        TypeSpecificFields::Requirement { level, .. } => (Some(level.as_str().to_string()), None),
        TypeSpecificFields::Task { progress, .. } => (None, Some(format!("{:?}", progress).to_lowercase())),
        _ => (None, None),
    };

    SpecSummary {
        id: doc.id_str(),
        entity_type: doc.universal.entity_type.type_name().to_string(),
        status: doc.universal.status.as_str().to_string(),
        level,
        summary: doc.universal.summary.clone(),
        version: doc.universal.version.clone(),
        owners: doc.universal.owners.clone(),
        progress,
    }
}

fn doc_to_full(doc: &spec_cli::model::document::SpecDocument) -> SpecFull {
    use spec_cli::model::frontmatter::TypeSpecificFields;

    let (level, progress, refines) = match &doc.type_fields {
        TypeSpecificFields::Requirement { level, refines, .. } => {
            (Some(level.as_str().to_string()), None, refines.clone())
        }
        TypeSpecificFields::Task { progress, refines, .. } => {
            (None, Some(format!("{:?}", progress).to_lowercase()), refines.clone())
        }
        _ => (None, None, Vec::new()),
    };

    SpecFull {
        id: doc.id_str(),
        entity_type: doc.universal.entity_type.type_name().to_string(),
        status: doc.universal.status.as_str().to_string(),
        level,
        summary: doc.universal.summary.clone(),
        version: doc.universal.version.clone(),
        owners: doc.universal.owners.clone(),
        progress,
        body: doc.body_raw.clone(),
        source_path: doc.source_path.display().to_string(),
        refines,
        related: doc.universal.related.clone(),
    }
}

// ── Tauri commands ─────────────────────────────────────────────────

#[tauri::command]
pub fn spec_list_specs(specs_dir: String) -> Result<Vec<SpecSummary>, String> {
    let specs_dir = expand_tilde(&specs_dir);
    let registry = spec_cli::model::registry::SpecRegistry::load(Path::new(specs_dir.as_ref()))
        .map_err(|e| format!("{e:#}"))?;

    Ok(registry.documents.iter().map(doc_to_summary).collect())
}

#[tauri::command]
pub fn spec_get_spec(specs_dir: String, id: String) -> Result<SpecFull, String> {
    let specs_dir = expand_tilde(&specs_dir);
    let registry = spec_cli::model::registry::SpecRegistry::load(Path::new(specs_dir.as_ref()))
        .map_err(|e| format!("{e:#}"))?;

    let doc = registry
        .get_by_id(&id)
        .ok_or_else(|| format!("spec not found: {id}"))?;

    Ok(doc_to_full(doc))
}

#[tauri::command]
pub fn spec_get_refinement_graph(specs_dir: String) -> Result<GraphData, String> {
    let specs_dir = expand_tilde(&specs_dir);
    let registry = spec_cli::model::registry::SpecRegistry::load(Path::new(specs_dir.as_ref()))
        .map_err(|e| format!("{e:#}"))?;

    let graph = spec_cli::graph::build::SpecGraph::refinement(&registry);
    let mut nodes = Vec::new();
    let mut edges = Vec::new();

    for doc in &registry.documents {
        let id = doc.id_str();
        use spec_cli::model::frontmatter::TypeSpecificFields;

        let (level, progress) = match &doc.type_fields {
            TypeSpecificFields::Requirement { level, .. } => {
                (Some(level.as_str().to_string()), None)
            }
            TypeSpecificFields::Task { progress, .. } => {
                (None, Some(format!("{:?}", progress).to_lowercase()))
            }
            _ => (None, None),
        };

        nodes.push(GraphNode {
            id: id.clone(),
            entity_type: doc.universal.entity_type.type_name().to_string(),
            summary: doc.universal.summary.clone(),
            status: doc.universal.status.as_str().to_string(),
            level,
            progress,
        });
    }

    // Extract edges from the petgraph
    for edge in graph.graph.edge_indices() {
        if let Some((from_idx, to_idx)) = graph.graph.edge_endpoints(edge) {
            if let (Some(from_id), Some(to_id)) = (
                graph.graph.node_weight(from_idx),
                graph.graph.node_weight(to_idx),
            ) {
                edges.push(GraphEdge {
                    from: from_id.clone(),
                    to: to_id.clone(),
                });
            }
        }
    }

    Ok(GraphData { nodes, edges })
}

#[tauri::command]
pub fn spec_get_categorization_graph(specs_dir: String) -> Result<GraphData, String> {
    let specs_dir = expand_tilde(&specs_dir);
    let registry = spec_cli::model::registry::SpecRegistry::load(Path::new(specs_dir.as_ref()))
        .map_err(|e| format!("{e:#}"))?;

    let graph = spec_cli::graph::build::SpecGraph::categorization(&registry);
    let mut nodes = Vec::new();
    let mut edges = Vec::new();

    for doc in &registry.documents {
        let id = doc.id_str();
        nodes.push(GraphNode {
            id: id.clone(),
            entity_type: doc.universal.entity_type.type_name().to_string(),
            summary: doc.universal.summary.clone(),
            status: doc.universal.status.as_str().to_string(),
            level: None,
            progress: None,
        });
    }

    for edge in graph.graph.edge_indices() {
        if let Some((from_idx, to_idx)) = graph.graph.edge_endpoints(edge) {
            if let (Some(from_id), Some(to_id)) = (
                graph.graph.node_weight(from_idx),
                graph.graph.node_weight(to_idx),
            ) {
                edges.push(GraphEdge {
                    from: from_id.clone(),
                    to: to_id.clone(),
                });
            }
        }
    }

    Ok(GraphData { nodes, edges })
}

#[tauri::command]
pub fn spec_get_coverage(specs_dir: String, id: String) -> Result<Vec<CoverageEntry>, String> {
    let specs_dir = expand_tilde(&specs_dir);
    let registry = spec_cli::model::registry::SpecRegistry::load(Path::new(specs_dir.as_ref()))
        .map_err(|e| format!("{e:#}"))?;

    let coverage = spec_cli::graph::query::coverage(&registry, &id);
    Ok(coverage
        .into_iter()
        .map(|c| CoverageEntry {
            clause_id: c.clause_id,
            clause_text: c.clause_text,
            children: c.refined_by,
        })
        .collect())
}

#[tauri::command]
pub fn spec_get_lint_results(specs_dir: String) -> Result<Vec<LintDiagnostic>, String> {
    let specs_dir = expand_tilde(&specs_dir);
    let registry = spec_cli::model::registry::SpecRegistry::load(Path::new(specs_dir.as_ref()))
        .map_err(|e| format!("{e:#}"))?;

    let diags = spec_cli::lint::lint_all(&registry);
    Ok(diags
        .into_iter()
        .map(|d| LintDiagnostic {
            code: d.code,
            severity: format!("{}", d.severity),
            message: d.message,
            file: d.file.display().to_string(),
            line: d.line,
        })
        .collect())
}

#[tauri::command]
pub fn spec_get_history(specs_dir: String, id: String) -> Result<Vec<HistoryEvent>, String> {
    let specs_dir = expand_tilde(&specs_dir);
    let path = Path::new(specs_dir.as_ref());

    // History files are at _history/<TYPE>_<ns>_<slug>.json
    let sanitized = id.replace(':', "_").replace('/', "_");
    let history_path = path.join("_history").join(format!("{sanitized}.json"));

    if !history_path.exists() {
        return Ok(Vec::new());
    }

    let content = std::fs::read_to_string(&history_path)
        .map_err(|e| format!("reading history: {e}"))?;

    #[derive(Deserialize)]
    struct HistoryFile {
        events: Vec<RawEvent>,
    }
    #[derive(Deserialize)]
    struct RawEvent {
        sha: String,
        kind: String,
        date: String,
        author: String,
    }

    let file: HistoryFile =
        serde_json::from_str(&content).map_err(|e| format!("parsing history: {e}"))?;

    Ok(file
        .events
        .into_iter()
        .map(|e| HistoryEvent {
            sha: e.sha,
            kind: e.kind,
            date: e.date,
            author: e.author,
        })
        .collect())
}

#[tauri::command]
pub fn spec_list_tasks(
    specs_dir: String,
    state: Option<String>,
) -> Result<Vec<TaskEntry>, String> {
    let specs_dir = expand_tilde(&specs_dir);
    let registry = spec_cli::model::registry::SpecRegistry::load(Path::new(specs_dir.as_ref()))
        .map_err(|e| format!("{e:#}"))?;

    use spec_cli::model::frontmatter::TypeSpecificFields;

    let mut tasks: Vec<TaskEntry> = Vec::new();

    for doc in &registry.documents {
        if let TypeSpecificFields::Task {
            progress,
            assignee,
            eta,
            blocked_by,
            ..
        } = &doc.type_fields
        {
            let progress_str = format!("{:?}", progress).to_lowercase();

            // Filter by state if provided
            if let Some(ref filter) = state {
                if filter != "all" && progress_str != *filter {
                    continue;
                }
            }

            tasks.push(TaskEntry {
                id: doc.id_str(),
                summary: doc.universal.summary.clone(),
                progress: progress_str,
                assignee: assignee.clone(),
                eta: eta.clone(),
                blocked_by: blocked_by.clone(),
            });
        }
    }

    Ok(tasks)
}

/// Resolve the auxiliary roots (forge-spec projects) configured for a vault.
/// Wraps `load_aux_roots` so the frontend can discover `specsDir` values to
/// pass to the other `spec_*` commands.
#[tauri::command]
pub fn spec_resolve_aux_roots(vault_path: String) -> Result<Vec<AuxRootEntry>, String> {
    let expanded = expand_tilde(&vault_path);
    let roots = load_aux_roots(Path::new(expanded.as_ref()));
    Ok(roots
        .into_iter()
        .map(|r| AuxRootEntry {
            label: r.label,
            path: r.path.display().to_string(),
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture_path() -> String {
        concat!(env!("CARGO_MANIFEST_DIR"), "/../../example/.specs").to_string()
    }

    #[test]
    fn list_specs_returns_example_fixture() {
        let summaries = spec_list_specs(fixture_path()).expect("list_specs failed");
        assert!(summaries.len() >= 6, "expected >=6 specs, got {}", summaries.len());

        let ids: Vec<&str> = summaries.iter().map(|s| s.id.as_str()).collect();
        assert!(ids.contains(&"REQ:auth/session-expiry"));
        assert!(ids.contains(&"ADR:auth/0001-session-storage"));
        assert!(ids.contains(&"INV:auth/no-stale-tokens"));

        let req = summaries
            .iter()
            .find(|s| s.id == "REQ:auth/session-expiry")
            .unwrap();
        assert_eq!(req.entity_type, "requirement");
        assert_eq!(req.status, "draft");
        assert_eq!(req.level.as_deref(), Some("MUST"));
    }

    #[test]
    fn get_spec_full_payload() {
        let full = spec_get_spec(fixture_path(), "REQ:auth/session-expiry".to_string())
            .expect("get_spec failed");
        assert_eq!(full.id, "REQ:auth/session-expiry");
        assert!(full.body.contains("Session expiry policy"));
        assert!(!full.refines.is_empty());
    }

    #[test]
    fn refinement_graph_has_nodes_and_edges() {
        let graph = spec_get_refinement_graph(fixture_path()).expect("refinement graph failed");
        assert!(!graph.nodes.is_empty());
        assert!(!graph.edges.is_empty());

        // session-expiry refines session-management
        let has_refines_edge = graph.edges.iter().any(|e| {
            e.from == "REQ:auth/session-expiry" && e.to.starts_with("REQ:auth/session-management")
        });
        assert!(has_refines_edge, "missing session-expiry → session-management edge");
    }

    #[test]
    fn categorization_graph_has_topic_edges() {
        let graph = spec_get_categorization_graph(fixture_path())
            .expect("categorization graph failed");
        assert!(!graph.nodes.is_empty());
        // session-expiry is categorized under TOPIC:topics/auth
        let has_topic_edge = graph
            .edges
            .iter()
            .any(|e| e.from == "REQ:auth/session-expiry" && e.to == "TOPIC:topics/auth");
        assert!(has_topic_edge, "missing categorization edge to TOPIC:topics/auth");
    }

    #[test]
    fn coverage_returns_clauses() {
        let coverage = spec_get_coverage(
            fixture_path(),
            "REQ:auth/session-management".to_string(),
        )
        .expect("coverage failed");
        assert!(!coverage.is_empty(), "expected at least one clause");
        let ids: Vec<&str> = coverage.iter().map(|c| c.clause_id.as_str()).collect();
        assert!(ids.iter().any(|id| id.contains("c-lifetime")));
    }

    #[test]
    fn lint_results_include_r018_and_r019() {
        let diags = spec_get_lint_results(fixture_path()).expect("lint failed");
        let codes: Vec<&str> = diags.iter().map(|d| d.code.as_str()).collect();
        assert!(codes.contains(&"R018"), "expected R018 in {codes:?}");
        assert!(codes.contains(&"R019"), "expected R019 in {codes:?}");

        let r018 = diags.iter().find(|d| d.code == "R018").unwrap();
        assert_eq!(r018.severity, "error");

        let r019 = diags.iter().find(|d| d.code == "R019").unwrap();
        assert_eq!(r019.severity, "warning");
    }

    #[test]
    fn list_tasks_handles_missing_state() {
        // The example fixture has no TASK entries, so this should be an empty list.
        let tasks = spec_list_tasks(fixture_path(), None).expect("list_tasks failed");
        assert!(tasks.is_empty() || tasks.iter().all(|t| !t.id.is_empty()));
    }

    #[test]
    fn unknown_spec_returns_error() {
        let result = spec_get_spec(fixture_path(), "REQ:nope/does-not-exist".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn resolve_aux_roots_returns_empty_for_unknown_vault() {
        let dir = tempfile::TempDir::new().unwrap();
        let roots = spec_resolve_aux_roots(dir.path().display().to_string())
            .expect("resolve aux roots");
        assert!(roots.is_empty());
    }

    #[test]
    fn resolve_aux_roots_reads_configured_projects() {
        let dir = tempfile::TempDir::new().unwrap();
        let vault = dir.path().join("vault");
        let specs = dir.path().join("the-specs");
        std::fs::create_dir_all(vault.join("config")).unwrap();
        std::fs::create_dir_all(&specs).unwrap();
        std::fs::write(
            vault.join("config/forge-spec.md"),
            "projects:\n  - path: ../the-specs\n    label: Spec Bundle\n",
        )
        .unwrap();

        let roots = spec_resolve_aux_roots(vault.display().to_string())
            .expect("resolve aux roots");
        assert_eq!(roots.len(), 1);
        assert_eq!(roots[0].label, "Spec Bundle");
        assert!(roots[0].path.ends_with("the-specs"));
    }
}
