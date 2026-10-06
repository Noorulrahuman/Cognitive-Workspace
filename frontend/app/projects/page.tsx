"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  source_url?: string | null;
  documents_count: number;
  status: string;
  created_at: string;
}

const DEFAULT_PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "Financial Document Intelligence",
    description: "Multi-agent extraction and automated ratio analysis on 10-K financial reports using PyMuPDF and LangGraph.",
    category: "Agentic Workflow",
    tags: ["LangGraph", "PyMuPDF", "FastAPI"],
    source_url: "https://sec.gov/edgar",
    documents_count: 14,
    status: "Active",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "proj-2",
    name: "Biomedical Literature Search",
    description: "Dense vector retrieval pipeline with Supabase pgvector and automated literature citation graph.",
    category: "Semantic Search",
    tags: ["Supabase", "pgvector", "RAG"],
    source_url: "https://pubmed.ncbi.nlm.nih.gov",
    documents_count: 86,
    status: "Active",
    created_at: "2026-10-03T14:30:00Z"
  },
  {
    id: "proj-3",
    name: "Regulatory Web Scraper",
    description: "Headless Chromium crawler driven by Playwright and BeautifulSoup4 for monitoring regulatory amendments.",
    category: "Document Extraction",
    tags: ["Playwright", "BeautifulSoup4", "Pandas"],
    source_url: "https://regulations.gov",
    documents_count: 42,
    status: "Active",
    created_at: "2026-10-04T09:15:00Z"
  }
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    category: "Agentic Workflow",
    tags: "",
    source_url: "",
    description: ""
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch projects from backend or fallback to localStorage
  useEffect(() => {
    let isMounted = true;
    async function loadProjects() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/projects");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setProjects(data);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to local storage or defaults
      }

      const saved = localStorage.getItem("cognitive_projects");
      if (saved && isMounted) {
        try {
          setProjects(JSON.parse(saved));
        } catch {
          setProjects(DEFAULT_PROJECTS);
        }
      } else if (isMounted) {
        setProjects(DEFAULT_PROJECTS);
      }
      if (isMounted) setLoading(false);
    }

    loadProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  const saveLocalProjects = (updated: Project[]) => {
    setProjects(updated);
    localStorage.setItem("cognitive_projects", JSON.stringify(updated));
  };

  // Handle Add Project Submit
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    const parsedTags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const newProjectPayload = {
      name: formData.name.trim(),
      description: formData.description.trim() || "Cognitive pipeline workspace project.",
      category: formData.category,
      tags: parsedTags.length > 0 ? parsedTags : [formData.category],
      source_url: formData.source_url.trim() || undefined
    };

    let createdProject: Project | null = null;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProjectPayload)
      });
      if (res.ok) {
        createdProject = await res.json();
      }
    } catch {
      // offline fallback
    }

    if (!createdProject) {
      createdProject = {
        id: `proj-${Date.now()}`,
        name: newProjectPayload.name,
        description: newProjectPayload.description,
        category: newProjectPayload.category,
        tags: newProjectPayload.tags,
        source_url: newProjectPayload.source_url,
        documents_count: newProjectPayload.source_url ? 1 : 0,
        status: "Active",
        created_at: new Date().toISOString()
      };
    }

    const updated = [createdProject, ...projects];
    saveLocalProjects(updated);

    setFormData({
      name: "",
      category: "Agentic Workflow",
      tags: "",
      source_url: "",
      description: ""
    });
    setSubmitting(false);
    setIsAddModalOpen(false);
    showToast(`Project "${createdProject.name}" successfully created!`);
  };

  // Handle Delete Project
  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    const targetId = projectToDelete.id;
    const targetName = projectToDelete.name;

    try {
      await fetch(`http://127.0.0.1:8000/api/v1/projects/${targetId}`, {
        method: "DELETE"
      });
    } catch {
      // offline fallback
    }

    const updated = projects.filter((p) => p.id !== targetId);
    saveLocalProjects(updated);
    setProjectToDelete(null);
    showToast(`Project "${targetName}" removed.`);
  };

  const categories = ["All", "Agentic Workflow", "Semantic Search", "Document Extraction"];

  const filteredProjects = projects.filter((p) => {
    const matchesCategory =
      selectedCategory === "All" || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.tags.some((t) => t.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-full py-8 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl animate-fade-in backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <p className="text-sm font-medium">{toastMessage}</p>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-2">
            <span>Workspace Management</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Projects & Pipelines
          </h1>
          <p className="mt-1 text-sm text-zinc-400 max-w-xl">
            Create, configure, and monitor cognitive projects. Each project coordinates autonomous agents, document stores, and vector indices.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Project
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search projects or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 px-3.5 py-1.5 pl-9 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-xl border border-zinc-800/60 bg-zinc-900/30 animate-pulse p-6" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
            <div className="mx-auto h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-300">No projects found</h3>
            <p className="mt-1 text-xs text-zinc-500">
              {searchQuery ? "Try refining your search query or filter." : "Get started by adding your first project."}
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer"
            >
              + Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="group relative flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900/90 shadow-sm"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-block rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-indigo-300">
                      {project.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[11px] font-mono text-zinc-400">{project.status}</span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-zinc-100 group-hover:text-indigo-400 transition-colors">
                    {project.name}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400 line-clamp-3">
                    {project.description}
                  </p>

                  {/* Tags */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[10px] font-mono text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer details & Actions */}
                <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between">
                  <div className="text-[11px] text-zinc-500 font-mono">
                    <span>{project.documents_count} docs indexed</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/chat?project=${encodeURIComponent(project.name)}`}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white transition-colors"
                      title="Open in AI Copilot"
                    >
                      Copilot &rarr;
                    </Link>

                    {/* Remove Project Button */}
                    <button
                      onClick={() => setProjectToDelete(project)}
                      className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Remove Project"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD PROJECT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white">Create New Project</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddProject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Legal Compliance Analyzer"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Architecture Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Agentic Workflow">Agentic Workflow (LangGraph)</option>
                  <option value="Semantic Search">Semantic Search (pgvector & Supabase)</option>
                  <option value="Document Extraction">Document Extraction (PDF/Web Scraper)</option>
                  <option value="API Automation">API Automation (FastAPI Engine)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. LangGraph, PyMuPDF, Playwright"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Source Ingestion URL or Seed Path (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://example.com/reports or s3://bucket/docs"
                  value={formData.source_url}
                  onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of purpose, extraction objectives, and workflow goals..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-900/50 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Project</h3>
                <p className="text-xs text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-zinc-300">
              Are you sure you want to remove <span className="font-semibold text-white">&ldquo;{projectToDelete.name}&rdquo;</span> from the workspace? All associated agent states will be decoupled.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-md cursor-pointer"
              >
                Yes, Remove Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
