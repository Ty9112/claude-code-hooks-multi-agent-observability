import { ref, computed, onMounted } from 'vue';
import { API_BASE_URL } from '../config';

// ── Data interfaces ──────────────────────────────────────
export interface SkillInfo {
  name: string;
  description: string;
  pluginName: string;
  author?: string;
  type?: 'command' | 'agent' | 'skill';
}

export interface McpServerInfo {
  name: string;
  transport: string;
  command: string | null;
  args: string[];
  url: string | null;
}

export interface MarketplaceEntry {
  name: string;
  url: string;
  description: string;
  category: 'registry' | 'popular';
}

// ── Tree navigation types ────────────────────────────────
export type NodeType = 'root' | 'section' | 'group' | 'item';

export interface TreeNode {
  id: string;
  label: string;
  icon: string;           // unicode icon char
  type: NodeType;
  children?: TreeNode[];
  data?: SkillInfo | McpServerInfo | MarketplaceEntry;
  badge?: string;          // count or transport badge
  badgeColor?: string;     // tailwind color class fragment
  meta?: string;           // secondary text line
}

export interface BreadcrumbItem {
  id: string;
  label: string;
}

// ── Static marketplace data ──────────────────────────────
const MARKETPLACE: MarketplaceEntry[] = [
  { name: 'Smithery', url: 'https://smithery.ai', description: 'MCP server registry and discovery', category: 'registry' },
  { name: 'MCP.run', url: 'https://mcp.run', description: 'Run MCP servers in the cloud', category: 'registry' },
  { name: 'Glama', url: 'https://glama.ai/mcp/servers', description: 'MCP server directory', category: 'registry' },
  { name: 'GitHub MCP Servers', url: 'https://github.com/modelcontextprotocol/servers', description: 'Official MCP server implementations', category: 'popular' },
  { name: 'Playwright MCP', url: 'https://github.com/microsoft/playwright-mcp', description: 'Browser automation via MCP', category: 'popular' },
  { name: 'Memory MCP', url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory', description: 'Persistent memory for Claude', category: 'popular' },
  { name: 'Claude Market', url: 'https://github.com/claude-market/marketplace', description: 'Open source curated marketplace for Claude Code tools', category: 'registry' },
];

// ── Section documentation ────────────────────────────────
export const SECTION_DOCS: Record<string, { title: string; description: string; details: string[] }> = {
  skills: {
    title: 'Skills',
    description: 'Skills teach Claude specialized workflows and domain knowledge. They are loaded from plugins installed in ~/.claude/plugins/.',
    details: [
      'Skills are defined in plugin.json manifests inside each plugin folder',
      'Run /plugin to manage plugins and discover new skills',
      'Skills can provide slash commands, agents, hooks, and MCP servers',
      'Install plugins via: /plugin install plugin-name@marketplace-name',
    ],
  },
  mcp: {
    title: 'MCP Servers',
    description: 'Model Context Protocol servers connect Claude to external tools and data sources. Configured in ~/.claude/settings.json.',
    details: [
      'Servers use stdio (local process) or SSE (remote HTTP) transport',
      'Each server exposes tools that Claude can call during conversations',
      'MCP servers are the bridge between Claude and your infrastructure',
      'Add servers via: claude mcp add --transport stdio name -- command args',
    ],
  },
  marketplace: {
    title: 'Marketplace',
    description: 'Discover plugin registries and popular MCP servers to extend your Claude Code environment.',
    details: [
      'Add a marketplace: /plugin marketplace add owner/repo',
      'Browse with: /plugin → Discover tab',
      'Official Anthropic marketplace is auto-available',
      'Quality varies — start with 3-5 plugins and expand carefully',
    ],
  },
};

// ── Composable ───────────────────────────────────────────
export function useToolkit() {
  const skills = ref<SkillInfo[]>([]);
  const mcpServers = ref<McpServerInfo[]>([]);
  const marketplace = ref<MarketplaceEntry[]>(MARKETPLACE);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Navigation state
  const selectedNodeId = ref<string | null>(null);
  const expandedSections = ref<Set<string>>(new Set(['skills', 'mcp', 'marketplace']));

  // ── Build tree from data ─────────────────────────────
  const tree = computed<TreeNode[]>(() => {
    const nodes: TreeNode[] = [];

    // Skills section — group by plugin
    const pluginGroups = new Map<string, SkillInfo[]>();
    for (const s of skills.value) {
      const group = pluginGroups.get(s.pluginName) || [];
      group.push(s);
      pluginGroups.set(s.pluginName, group);
    }

    function skillIcon(s: SkillInfo): string {
      if (s.type === 'agent') return '\u{1F916}'; // 🤖
      if (s.type === 'command') return '\u{1F4AC}'; // 💬 (slash command)
      return '\u26A1'; // ⚡
    }

    const skillChildren: TreeNode[] = [];
    for (const [pluginName, pluginSkills] of pluginGroups) {
      if (pluginSkills.length === 1) {
        const s = pluginSkills[0];
        skillChildren.push({
          id: `skill:${s.pluginName}:${s.name}`,
          label: s.name,
          icon: skillIcon(s),
          type: 'item',
          data: s,
          meta: s.pluginName,
          badge: s.type,
          badgeColor: s.type === 'agent' ? 'blue' : s.type === 'command' ? 'green' : undefined,
        });
      } else {
        skillChildren.push({
          id: `skill-group:${pluginName}`,
          label: pluginName,
          icon: '\u25C6', // ◆
          type: 'group',
          badge: String(pluginSkills.length),
          children: pluginSkills.map(s => ({
            id: `skill:${s.pluginName}:${s.name}`,
            label: s.name,
            icon: skillIcon(s),
            type: 'item' as NodeType,
            data: s,
            badge: s.type,
            badgeColor: s.type === 'agent' ? 'blue' : s.type === 'command' ? 'green' : undefined,
          })),
        });
      }
    }

    nodes.push({
      id: 'skills',
      label: 'Skills',
      icon: '\u26A1', // ⚡
      type: 'section',
      badge: String(skills.value.length),
      children: skillChildren,
    });

    // MCP Servers section
    const serverChildren: TreeNode[] = mcpServers.value.map(s => ({
      id: `mcp:${s.name}`,
      label: s.name,
      icon: '\u2B21', // ⬡
      type: 'item' as NodeType,
      data: s,
      badge: s.transport,
      badgeColor: s.transport === 'stdio' ? 'green' : s.transport === 'sse' ? 'blue' : 'yellow',
    }));

    nodes.push({
      id: 'mcp',
      label: 'MCP Servers',
      icon: '\u2B21', // ⬡
      type: 'section',
      badge: String(mcpServers.value.length),
      children: serverChildren,
    });

    // Marketplace section
    const registries = marketplace.value.filter(e => e.category === 'registry');
    const popular = marketplace.value.filter(e => e.category === 'popular');

    const marketChildren: TreeNode[] = [];
    if (registries.length > 0) {
      marketChildren.push({
        id: 'marketplace-group:registries',
        label: 'Registries',
        icon: '\u25C8', // ◈
        type: 'group',
        badge: String(registries.length),
        children: registries.map(e => ({
          id: `marketplace:${e.name}`,
          label: e.name,
          icon: '\u25C8',
          type: 'item' as NodeType,
          data: e,
        })),
      });
    }
    if (popular.length > 0) {
      marketChildren.push({
        id: 'marketplace-group:popular',
        label: 'Popular',
        icon: '\u2605', // ★
        type: 'group',
        badge: String(popular.length),
        children: popular.map(e => ({
          id: `marketplace:${e.name}`,
          label: e.name,
          icon: '\u2605',
          type: 'item' as NodeType,
          data: e,
        })),
      });
    }

    nodes.push({
      id: 'marketplace',
      label: 'Marketplace',
      icon: '\u25C8',
      type: 'section',
      badge: String(marketplace.value.length),
      children: marketChildren,
    });

    return nodes;
  });

  // ── Find node by id (recursive) ─────────────────────
  function findNode(id: string, nodes?: TreeNode[]): TreeNode | null {
    for (const n of nodes || tree.value) {
      if (n.id === id) return n;
      if (n.children) {
        const found = findNode(id, n.children);
        if (found) return found;
      }
    }
    return null;
  }

  // ── Breadcrumb trail for selected node ───────────────
  const breadcrumb = computed<BreadcrumbItem[]>(() => {
    if (!selectedNodeId.value) return [];
    const trail: BreadcrumbItem[] = [];

    function walk(nodes: TreeNode[], path: BreadcrumbItem[]): boolean {
      for (const n of nodes) {
        const newPath = [...path, { id: n.id, label: n.label }];
        if (n.id === selectedNodeId.value) {
          trail.push(...newPath);
          return true;
        }
        if (n.children && walk(n.children, newPath)) return true;
      }
      return false;
    }

    walk(tree.value, []);
    return trail;
  });

  // Currently selected node
  const selectedNode = computed<TreeNode | null>(() =>
    selectedNodeId.value ? findNode(selectedNodeId.value) : null
  );

  // ── Navigation actions ───────────────────────────────
  function navigate(id: string) {
    selectedNodeId.value = id;
    // Auto-expand parent sections
    const parts = id.split(':');
    if (parts.length > 0) {
      // Expand the root section this belongs to
      for (const section of tree.value) {
        if (section.id === id || findNode(id, section.children ? [section, ...section.children] : [section])) {
          expandedSections.value.add(section.id);
        }
      }
    }
  }

  function toggleSection(id: string) {
    if (expandedSections.value.has(id)) {
      expandedSections.value.delete(id);
    } else {
      expandedSections.value.add(id);
    }
    // Also trigger to force reactivity
    expandedSections.value = new Set(expandedSections.value);
  }

  function isExpanded(id: string): boolean {
    return expandedSections.value.has(id);
  }

  // ── Data fetching ────────────────────────────────────
  async function fetchSkills() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/toolkit/skills`);
      if (res.ok) skills.value = await res.json();
    } catch { /* silent */ }
  }

  async function fetchMcpServers() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/toolkit/mcp-servers`);
      if (res.ok) mcpServers.value = await res.json();
    } catch { /* silent */ }
  }

  async function refresh() {
    loading.value = true;
    error.value = null;
    await Promise.all([fetchSkills(), fetchMcpServers()]);
    loading.value = false;
  }

  onMounted(() => { refresh(); });

  return {
    // Raw data
    skills, mcpServers, marketplace, loading, error, refresh,
    // Tree navigation
    tree, selectedNodeId, selectedNode, breadcrumb,
    expandedSections, navigate, toggleSection, isExpanded, findNode,
  };
}
