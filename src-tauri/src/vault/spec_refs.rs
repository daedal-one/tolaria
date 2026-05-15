//! Recognize forge-spec references in vault content.
//!
//! Spec references appear in two shapes:
//!
//! 1. **Bare ID** (frontmatter list values): `REQ:auth/foo`,
//!    `REQ:auth/foo#anchor`. Pattern:
//!    `^[A-Z]+:[A-Za-z0-9_-]+/[A-Za-z0-9_./-]+(#[A-Za-z0-9_-]+)?$`.
//! 2. **Prefixed URL** (body markdown links and some frontmatter values):
//!    `spec:REQ:auth/foo`, `spec:src:path/to/file.ts:1-20`,
//!    `spec:kb:engineering/auth/tokens.md#anchor`.
//!
//! `SpecRefKind` discriminates between proper spec entities (graph nodes the
//! inspector can resolve later), source-code anchors (`src:`), and
//! knowledge-base notes (`kb:`). The inspector renders all three but only
//! resolves `SpecEntity` to a vault entry.

use serde::{Deserialize, Serialize};

/// Classification of a single spec reference.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SpecRefKind {
    /// A canonical spec entity, e.g. `REQ:auth/session-expiry` or
    /// `REQ:auth/session-management#c-idle`. The string carries the full ID
    /// (including any `#anchor`) verbatim.
    SpecEntity(String),
    /// A source-code anchor, e.g. `packages/auth/session.ts:42-78`. Stored
    /// raw; the inspector does not attempt to resolve it to a vault entry.
    Source(String),
    /// A knowledge-base note, e.g. `engineering/auth/tokens.md#section`.
    KnowledgeBase(String),
}

impl SpecRefKind {
    /// Return the stored target string, regardless of variant.
    pub fn target(&self) -> &str {
        match self {
            SpecRefKind::SpecEntity(s)
            | SpecRefKind::Source(s)
            | SpecRefKind::KnowledgeBase(s) => s,
        }
    }
}

/// Classify a single value as a spec reference, or return `None` if it does
/// not match any spec-reference shape.
///
/// The input may be a bare ID (`REQ:auth/foo`) or a prefixed URL
/// (`spec:REQ:auth/foo`, `spec:src:...`, `spec:kb:...`). Leading and
/// trailing whitespace is ignored.
pub fn extract_spec_id(value: &str) -> Option<SpecRefKind> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    let body = trimmed.strip_prefix("spec:").unwrap_or(trimmed);

    if let Some(rest) = body.strip_prefix("src:") {
        return classify_aux_ref(rest).map(SpecRefKind::Source);
    }
    if let Some(rest) = body.strip_prefix("kb:") {
        return classify_aux_ref(rest).map(SpecRefKind::KnowledgeBase);
    }
    classify_entity(body).map(SpecRefKind::SpecEntity)
}

/// Validate a value as `TYPE:namespace/slug(#anchor)?` and return it
/// verbatim when well-formed.
fn classify_entity(value: &str) -> Option<String> {
    let (head, anchor) = match value.find('#') {
        Some(idx) => (&value[..idx], Some(&value[idx + 1..])),
        None => (value, None),
    };
    let (kind, rest) = head.split_once(':')?;
    if kind.is_empty() || !kind.chars().all(|c| c.is_ascii_uppercase()) {
        return None;
    }
    let (namespace, slug) = rest.split_once('/')?;
    if !is_valid_namespace(namespace) || !is_valid_slug(slug) {
        return None;
    }
    if let Some(a) = anchor {
        if !is_valid_anchor(a) {
            return None;
        }
    }
    Some(value.to_string())
}

/// Validate the raw path that follows `src:` or `kb:`. Anything non-empty
/// with no whitespace is acceptable — these are passed through to the
/// inspector verbatim.
fn classify_aux_ref(value: &str) -> Option<String> {
    if value.is_empty() {
        return None;
    }
    if value.chars().any(char::is_whitespace) {
        return None;
    }
    Some(value.to_string())
}

fn is_valid_namespace(ns: &str) -> bool {
    !ns.is_empty()
        && ns
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

fn is_valid_slug(slug: &str) -> bool {
    !slug.is_empty()
        && slug.chars().all(|c| {
            c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.' || c == '/'
        })
}

fn is_valid_anchor(anchor: &str) -> bool {
    !anchor.is_empty()
        && anchor
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

/// Scan body markdown for CommonMark links whose href starts with `spec:`.
///
/// Returns each detected reference paired with the raw target string
/// (without the `spec:` prefix; for entity refs the bare ID, for `src:` /
/// `kb:` refs the path).
///
/// This is a substring-based scanner — it matches `](spec:...)` patterns
/// without invoking a markdown parser. Code spans are not skipped, which
/// matches Tolaria's existing wikilink scanner behavior.
pub fn scan_body_spec_links(body: &str) -> Vec<(SpecRefKind, String)> {
    let mut out: Vec<(SpecRefKind, String)> = Vec::new();
    let needle = "](spec:";
    let mut cursor = 0;
    while let Some(found) = body[cursor..].find(needle) {
        let href_start = cursor + found + 2; // points at "spec:"
        let after = &body[href_start..];
        let end_offset = href_end(after);
        let href = &after[..end_offset];
        if let Some(kind) = extract_spec_id(href) {
            let target = kind.target().to_string();
            out.push((kind, target));
        }
        cursor = href_start + end_offset;
    }
    dedup_in_place(&mut out);
    out
}

/// Find the offset within `s` where the markdown link href ends — at the
/// first unescaped `)` or whitespace character.
fn href_end(s: &str) -> usize {
    for (i, c) in s.char_indices() {
        if c == ')' || c.is_whitespace() {
            return i;
        }
    }
    s.len()
}

fn dedup_in_place(items: &mut Vec<(SpecRefKind, String)>) {
    let mut seen: Vec<(SpecRefKind, String)> = Vec::with_capacity(items.len());
    items.retain(|item| {
        if seen.contains(item) {
            false
        } else {
            seen.push(item.clone());
            true
        }
    });
}

/// Convenience: collect just the bare-entity targets from a frontmatter
/// value scalar or list. Used by the frontmatter extractor to decide
/// whether a field carries any spec relationships.
pub fn collect_spec_entity_targets(value: &serde_json::Value) -> Vec<String> {
    let mut out = Vec::new();
    collect_targets_recursive(value, &mut out);
    out
}

fn collect_targets_recursive(value: &serde_json::Value, out: &mut Vec<String>) {
    match value {
        serde_json::Value::String(s) => {
            if let Some(SpecRefKind::SpecEntity(id)) = extract_spec_id(s) {
                out.push(id);
            }
        }
        serde_json::Value::Array(arr) => {
            for item in arr {
                collect_targets_recursive(item, out);
            }
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- extract_spec_id ---

    #[test]
    fn bare_requirement_id() {
        let got = extract_spec_id("REQ:auth/session-expiry");
        assert_eq!(
            got,
            Some(SpecRefKind::SpecEntity("REQ:auth/session-expiry".into()))
        );
    }

    #[test]
    fn bare_id_with_anchor() {
        let got = extract_spec_id("REQ:auth/session-management#c-idle");
        assert_eq!(
            got,
            Some(SpecRefKind::SpecEntity(
                "REQ:auth/session-management#c-idle".into()
            ))
        );
    }

    #[test]
    fn prefixed_spec_url_in_value() {
        let got = extract_spec_id("spec:ADR:auth/0001-session-storage");
        assert_eq!(
            got,
            Some(SpecRefKind::SpecEntity(
                "ADR:auth/0001-session-storage".into()
            ))
        );
    }

    #[test]
    fn src_ref_kept_raw() {
        let got = extract_spec_id("spec:src:packages/auth/session.ts:42-78");
        assert_eq!(
            got,
            Some(SpecRefKind::Source(
                "packages/auth/session.ts:42-78".into()
            ))
        );
    }

    #[test]
    fn kb_ref_with_anchor() {
        let got = extract_spec_id("spec:kb:engineering/auth/tokens.md#section");
        assert_eq!(
            got,
            Some(SpecRefKind::KnowledgeBase(
                "engineering/auth/tokens.md#section".into()
            ))
        );
    }

    #[test]
    fn rejects_lowercase_kind() {
        assert!(extract_spec_id("req:auth/foo").is_none());
    }

    #[test]
    fn rejects_mixed_case_kind() {
        assert!(extract_spec_id("Req:auth/foo").is_none());
    }

    #[test]
    fn rejects_missing_namespace() {
        assert!(extract_spec_id("REQ:/foo").is_none());
    }

    #[test]
    fn rejects_missing_slug() {
        assert!(extract_spec_id("REQ:auth/").is_none());
    }

    #[test]
    fn rejects_bad_anchor() {
        // Anchors only allow alnum, _, -
        assert!(extract_spec_id("REQ:auth/foo#has space").is_none());
    }

    #[test]
    fn rejects_empty() {
        assert!(extract_spec_id("").is_none());
        assert!(extract_spec_id("   ").is_none());
    }

    #[test]
    fn rejects_plain_url() {
        assert!(extract_spec_id("https://example.com").is_none());
    }

    #[test]
    fn rejects_plain_word() {
        assert!(extract_spec_id("just a sentence").is_none());
    }

    #[test]
    fn trims_whitespace() {
        let got = extract_spec_id("  REQ:auth/foo  ");
        assert_eq!(got, Some(SpecRefKind::SpecEntity("REQ:auth/foo".into())));
    }

    #[test]
    fn src_ref_rejects_whitespace() {
        assert!(extract_spec_id("spec:src:has space.ts").is_none());
    }

    #[test]
    fn src_ref_rejects_empty_path() {
        assert!(extract_spec_id("spec:src:").is_none());
    }

    #[test]
    fn slug_allows_dots_and_subpaths() {
        // ADR slug is e.g. "0001-session-storage" — no dots — but specs sometimes
        // nest like "tools/auth/v2".
        let got = extract_spec_id("IFC:auth/tools/v2.api");
        assert_eq!(
            got,
            Some(SpecRefKind::SpecEntity("IFC:auth/tools/v2.api".into()))
        );
    }

    // --- scan_body_spec_links ---

    #[test]
    fn body_link_to_spec_entity() {
        let md = "See [the ADR](spec:ADR:auth/0001-session-storage) for context.";
        let refs = scan_body_spec_links(md);
        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].1, "ADR:auth/0001-session-storage");
        assert!(matches!(refs[0].0, SpecRefKind::SpecEntity(_)));
    }

    #[test]
    fn body_link_to_src_and_kb() {
        let md = "Look at [code](spec:src:packages/auth/session.ts:42-78) and \
                  [notes](spec:kb:engineering/auth/tokens.md#rotation).";
        let refs = scan_body_spec_links(md);
        assert_eq!(refs.len(), 2);
        assert!(matches!(refs[0].0, SpecRefKind::Source(_)));
        assert_eq!(refs[0].1, "packages/auth/session.ts:42-78");
        assert!(matches!(refs[1].0, SpecRefKind::KnowledgeBase(_)));
        assert_eq!(refs[1].1, "engineering/auth/tokens.md#rotation");
    }

    #[test]
    fn body_scan_dedupes_repeats() {
        let md = "[a](spec:REQ:auth/foo) and [b](spec:REQ:auth/foo) again.";
        let refs = scan_body_spec_links(md);
        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].1, "REQ:auth/foo");
    }

    #[test]
    fn body_scan_ignores_non_spec_links() {
        let md = "[home](https://example.com) and [docs](./docs/index.md).";
        let refs = scan_body_spec_links(md);
        assert!(refs.is_empty());
    }

    #[test]
    fn body_scan_handles_no_links() {
        assert!(scan_body_spec_links("just text").is_empty());
        assert!(scan_body_spec_links("").is_empty());
    }

    #[test]
    fn body_scan_skips_malformed_refs() {
        let md = "[x](spec:not-a-ref) and [y](spec:REQ:auth/) and [z](spec:REQ:auth/ok)";
        let refs = scan_body_spec_links(md);
        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].1, "REQ:auth/ok");
    }

    #[test]
    fn body_scan_stops_at_paren_or_whitespace() {
        let md = "[a](spec:REQ:auth/foo) [b](spec:REQ:auth/bar more)";
        let refs = scan_body_spec_links(md);
        // First link is well-formed. Second href contains whitespace inside the
        // markdown link target — we stop at the space and "REQ:auth/bar" alone
        // is a valid entity.
        assert!(refs.iter().any(|(_, t)| t == "REQ:auth/foo"));
        assert!(refs.iter().any(|(_, t)| t == "REQ:auth/bar"));
    }

    // --- collect_spec_entity_targets ---

    #[test]
    fn collect_targets_from_list() {
        let v = serde_json::json!([
            "REQ:auth/session-management#c-lifetime",
            "REQ:auth/session-management#c-idle"
        ]);
        let got = collect_spec_entity_targets(&v);
        assert_eq!(
            got,
            vec![
                "REQ:auth/session-management#c-lifetime".to_string(),
                "REQ:auth/session-management#c-idle".to_string(),
            ]
        );
    }

    #[test]
    fn collect_targets_skips_non_matches() {
        let v = serde_json::json!(["REQ:auth/foo", "not-a-spec-id", "[[wikilink]]"]);
        let got = collect_spec_entity_targets(&v);
        assert_eq!(got, vec!["REQ:auth/foo".to_string()]);
    }

    #[test]
    fn collect_targets_from_scalar() {
        let v = serde_json::json!("REQ:auth/single");
        let got = collect_spec_entity_targets(&v);
        assert_eq!(got, vec!["REQ:auth/single".to_string()]);
    }
}
