use serde::{Deserialize, Serialize};
use std::path::Path;

use super::expand_tilde;

// ── Data transfer types ────────────────────────────────────────────

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
