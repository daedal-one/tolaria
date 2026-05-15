use super::*;

/// Frontmatter spec references (`refines:`, `related:`, …) must surface in
/// `relationships` under the original field name with bare-ID targets.
#[test]
fn frontmatter_refines_becomes_relationship() {
    let dir = TempDir::new().unwrap();
    let content = r#"---
id: REQ:auth/session-expiry
type: requirement
status: draft
refines:
  - REQ:auth/session-management#c-lifetime
  - REQ:auth/session-management#c-idle
related: [INV:auth/no-stale-tokens, IFC:auth/session-api]
---

# Session expiry policy
"#;
    let entry = parse_test_entry(&dir, "session-expiry.spec.md", content);

    let refines = entry.relationships.get("refines").unwrap();
    assert!(refines.contains(&"REQ:auth/session-management#c-lifetime".to_string()));
    assert!(refines.contains(&"REQ:auth/session-management#c-idle".to_string()));

    let related = entry.relationships.get("related").unwrap();
    assert!(related.contains(&"INV:auth/no-stale-tokens".to_string()));
    assert!(related.contains(&"IFC:auth/session-api".to_string()));
}

/// Body markdown `[label](spec:TYPE:ns/slug)` must surface under `body_refs`.
#[test]
fn body_spec_link_becomes_body_ref() {
    let dir = TempDir::new().unwrap();
    let content = r#"---
id: REQ:auth/session-expiry
type: requirement
---

# Session expiry policy

See [the ADR](spec:ADR:auth/0001-session-storage) for context.
"#;
    let entry = parse_test_entry(&dir, "body-link.spec.md", content);
    let body_refs = entry.relationships.get("body_refs").unwrap();
    assert!(body_refs.contains(&"ADR:auth/0001-session-storage".to_string()));
}

/// `spec:src:` and `spec:kb:` body links go into their own bucket keys.
#[test]
fn body_src_and_kb_links_get_separate_keys() {
    let dir = TempDir::new().unwrap();
    let content = r#"---
id: REQ:auth/session-expiry
type: requirement
---

# Body

Code: [session.ts](spec:src:packages/auth/session.ts:42-78).
Notes: [tokens](spec:kb:engineering/auth/tokens.md#rotation).
"#;
    let entry = parse_test_entry(&dir, "aux-links.spec.md", content);

    let source_refs = entry.relationships.get("source_refs").unwrap();
    assert!(source_refs.contains(&"packages/auth/session.ts:42-78".to_string()));

    let knowledge_refs = entry.relationships.get("knowledge_refs").unwrap();
    assert!(knowledge_refs.contains(&"engineering/auth/tokens.md#rotation".to_string()));
}

/// Wikilinks and spec IDs can coexist in the same frontmatter field; both
/// shapes are preserved verbatim in the same list.
#[test]
fn wikilinks_and_spec_ids_coexist() {
    let dir = TempDir::new().unwrap();
    let content = r#"---
related:
  - "[[notes/some-context]]"
  - REQ:auth/session-management
---

# Mixed
"#;
    let entry = parse_test_entry(&dir, "mixed.spec.md", content);
    let related = entry.relationships.get("related").unwrap();
    assert!(related.contains(&"[[notes/some-context]]".to_string()));
    assert!(related.contains(&"REQ:auth/session-management".to_string()));
}

/// Spec-ID frontmatter values must NOT be exposed as scalar properties — they
/// belong to `relationships` only.
#[test]
fn spec_id_value_is_not_scalar_property() {
    let dir = TempDir::new().unwrap();
    let content = r#"---
related: REQ:auth/session-management
---

# Scalar spec ref
"#;
    let entry = parse_test_entry(&dir, "scalar-spec.spec.md", content);
    let related = entry.relationships.get("related").unwrap();
    assert_eq!(related, &vec!["REQ:auth/session-management".to_string()]);
    assert!(
        !entry.properties.contains_key("related"),
        "spec-ID scalar must not leak into properties; got: {:?}",
        entry.properties
    );
}
