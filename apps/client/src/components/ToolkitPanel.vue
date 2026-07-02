<template>
  <div class="flex h-full overflow-hidden bg-[var(--theme-bg-primary)]">
    <!-- ═══ LEFT SIDEBAR ═══ -->
    <aside class="w-[200px] shrink-0 bg-[var(--theme-bg-secondary)] border-r border-[var(--theme-border-primary)] flex flex-col overflow-hidden">
      <!-- Branding header -->
      <div class="px-4 pt-4 pb-3 border-b border-[var(--theme-border-primary)]">
        <div class="text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--theme-primary)]">Claude Code</div>
        <div class="text-[13px] font-medium text-[var(--theme-text-primary)] mt-0.5">Toolkit Explorer</div>
        <div class="text-[10px] text-[var(--theme-text-tertiary)] font-mono-data mt-0.5">~/.claude/</div>
      </div>

      <!-- Nav tree -->
      <nav class="flex-1 overflow-y-auto py-2">
        <template v-for="section in tree" :key="section.id">
          <!-- Section header (clickable to expand/collapse) -->
          <button
            class="w-full flex items-center justify-between px-4 py-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase cursor-pointer hover:bg-[var(--theme-hover-bg)] transition-colors"
            :class="selectedNodeId === section.id ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-tertiary)]'"
            @click="handleSectionClick(section.id)"
          >
            <span>{{ section.label }}</span>
            <div class="flex items-center gap-1.5">
              <span
                v-if="section.badge && section.badge !== '0'"
                class="px-1 py-0 text-[9px] font-mono-data bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)]"
              >{{ section.badge }}</span>
              <svg
                class="w-3 h-3 transition-transform duration-150"
                :class="isExpanded(section.id) ? 'rotate-90' : ''"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>

          <!-- Section children -->
          <div v-if="isExpanded(section.id) && section.children" class="pb-1">
            <template v-for="child in section.children" :key="child.id">
              <!-- Group node (expandable) -->
              <template v-if="child.type === 'group'">
                <button
                  class="nav-item w-full flex items-center gap-2 px-4 py-1.5 text-[12px] cursor-pointer transition-all duration-150 border-l-2"
                  :class="selectedNodeId === child.id
                    ? 'text-[var(--theme-primary)] border-l-[var(--theme-primary)] bg-[var(--theme-primary)]/8'
                    : 'text-[var(--theme-text-secondary)] border-l-transparent hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-text-primary)]'"
                  @click="handleGroupClick(child.id)"
                >
                  <span class="w-4 text-center text-[11px] shrink-0">{{ child.icon }}</span>
                  <span class="truncate flex-1 text-left">{{ child.label }}</span>
                  <span v-if="child.badge" class="text-[9px] font-mono-data text-[var(--theme-text-tertiary)]">{{ child.badge }}</span>
                  <svg
                    class="w-2.5 h-2.5 transition-transform duration-150 shrink-0"
                    :class="isExpanded(child.id) ? 'rotate-90' : ''"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
                <!-- Group children -->
                <template v-if="isExpanded(child.id) && child.children">
                  <button
                    v-for="item in child.children"
                    :key="item.id"
                    class="nav-item w-full flex items-center gap-2 pl-9 pr-4 py-1 text-[11px] cursor-pointer transition-all duration-150 border-l-2"
                    :class="selectedNodeId === item.id
                      ? 'text-[var(--theme-primary)] border-l-[var(--theme-primary)] bg-[var(--theme-primary)]/8'
                      : 'text-[var(--theme-text-tertiary)] border-l-transparent hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-text-secondary)]'"
                    @click="navigate(item.id)"
                  >
                    <span class="w-3 text-center text-[10px] shrink-0">{{ item.icon }}</span>
                    <span class="truncate flex-1 text-left">{{ item.label }}</span>
                  </button>
                </template>
              </template>

              <!-- Leaf item (no children) -->
              <button
                v-else
                class="nav-item w-full flex items-center gap-2 px-4 py-1.5 text-[12px] cursor-pointer transition-all duration-150 border-l-2"
                :class="selectedNodeId === child.id
                  ? 'text-[var(--theme-primary)] border-l-[var(--theme-primary)] bg-[var(--theme-primary)]/8'
                  : 'text-[var(--theme-text-secondary)] border-l-transparent hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-text-primary)]'"
                @click="navigate(child.id)"
              >
                <span class="w-4 text-center text-[11px] shrink-0">{{ child.icon }}</span>
                <span class="truncate flex-1 text-left">{{ child.label }}</span>
                <span
                  v-if="child.badge"
                  class="px-1 py-0 text-[8px] font-mono-data uppercase border shrink-0"
                  :class="badgeClass(child.badgeColor)"
                >{{ child.badge }}</span>
              </button>
            </template>
          </div>
        </template>
      </nav>

      <!-- Sidebar footer -->
      <div class="px-4 py-2.5 border-t border-[var(--theme-border-primary)] flex items-center justify-between">
        <span class="text-[9px] font-mono-data text-[var(--theme-text-tertiary)]">Toolkit v1.0</span>
        <button
          @click="refresh"
          :disabled="loading"
          class="px-2 py-0.5 text-[9px] font-semibold tracking-wide border transition-all duration-150 bg-[var(--theme-bg-tertiary)] border-[var(--theme-border-primary)] text-[var(--theme-text-tertiary)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] disabled:opacity-50"
        >
          {{ loading ? '...' : 'REFRESH' }}
        </button>
      </div>
    </aside>

    <!-- ═══ RIGHT CONTENT ═══ -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Breadcrumb bar -->
      <div class="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] shrink-0">
        <button
          class="text-[11px] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)] transition-colors"
          @click="selectedNodeId = null"
        >Toolkit</button>
        <template v-for="(crumb, i) in breadcrumb" :key="crumb.id">
          <svg class="w-3 h-3 text-[var(--theme-text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <button
            class="text-[11px] transition-colors truncate max-w-[120px]"
            :class="i === breadcrumb.length - 1
              ? 'text-[var(--theme-text-primary)] font-semibold'
              : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)]'"
            @click="navigate(crumb.id)"
          >{{ crumb.label }}</button>
        </template>
      </div>

      <!-- Content area -->
      <div class="flex-1 overflow-y-auto p-5">
        <!-- Welcome state (nothing selected) -->
        <template v-if="!selectedNode">
          <div class="max-w-lg">
            <h2 class="text-lg font-bold text-[var(--theme-text-primary)] mb-2">Toolkit Explorer</h2>
            <p class="text-sm text-[var(--theme-text-secondary)] mb-5 leading-relaxed">
              Browse your Claude Code ecosystem — skills from plugins, MCP server connections, and marketplace registries. Select an item in the sidebar to view details.
            </p>
            <!-- Summary cards -->
            <div class="grid grid-cols-3 gap-3">
              <button
                v-for="section in tree"
                :key="section.id"
                @click="navigate(section.id)"
                class="p-4 border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] hover:border-[var(--theme-primary)] transition-colors text-left"
              >
                <div class="text-2xl mb-2">{{ section.icon }}</div>
                <div class="text-sm font-semibold text-[var(--theme-text-primary)]">{{ section.label }}</div>
                <div class="text-[11px] text-[var(--theme-text-tertiary)] font-mono-data mt-1">{{ section.badge }} items</div>
              </button>
            </div>
          </div>
        </template>

        <!-- Section overview (Skills / MCP Servers / Marketplace root) -->
        <template v-else-if="selectedNode.type === 'section'">
          <div class="max-w-2xl">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xl">{{ selectedNode.icon }}</span>
              <h2 class="text-lg font-bold text-[var(--theme-text-primary)]">{{ sectionDoc?.title || selectedNode.label }}</h2>
              <span class="px-1.5 py-0.5 text-[10px] font-mono-data bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)]">{{ selectedNode.badge }}</span>
            </div>
            <p class="text-sm text-[var(--theme-text-secondary)] mb-4 leading-relaxed">
              {{ sectionDoc?.description }}
            </p>

            <!-- Section documentation -->
            <div v-if="sectionDoc?.details" class="mb-5 p-4 border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]">
              <div class="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--theme-text-tertiary)] mb-2">Quick Reference</div>
              <ul class="space-y-1.5">
                <li v-for="(d, i) in sectionDoc.details" :key="i" class="flex items-start gap-2 text-xs text-[var(--theme-text-secondary)]">
                  <span class="text-[var(--theme-primary)] mt-0.5 shrink-0">&bull;</span>
                  <span class="font-mono-data">{{ d }}</span>
                </li>
              </ul>
            </div>

            <!-- Child items list -->
            <div v-if="selectedNode.children && selectedNode.children.length > 0" class="space-y-2">
              <div class="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--theme-text-tertiary)] mb-2">
                {{ selectedNode.children.length }} {{ selectedNode.children.length === 1 ? 'item' : 'items' }}
              </div>
              <button
                v-for="child in selectedNode.children"
                :key="child.id"
                @click="navigate(child.id)"
                class="w-full text-left p-3 border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] hover:border-[var(--theme-border-secondary)] transition-colors flex items-center gap-3"
              >
                <span class="text-sm">{{ child.icon }}</span>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-semibold text-[var(--theme-text-primary)] truncate">{{ child.label }}</div>
                  <div v-if="child.meta" class="text-[10px] text-[var(--theme-text-tertiary)] font-mono-data">{{ child.meta }}</div>
                </div>
                <span
                  v-if="child.badge"
                  class="px-1.5 py-0.5 text-[9px] font-mono-data uppercase border shrink-0"
                  :class="badgeClass(child.badgeColor)"
                >{{ child.badge }}</span>
                <svg class="w-3.5 h-3.5 text-[var(--theme-text-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <!-- Empty state -->
            <div v-else class="text-center py-8 text-[var(--theme-text-tertiary)] text-sm font-mono-data">
              No items found
            </div>
          </div>
        </template>

        <!-- Group view (plugin group or marketplace category) -->
        <template v-else-if="selectedNode.type === 'group'">
          <div class="max-w-2xl">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-lg">{{ selectedNode.icon }}</span>
              <h2 class="text-base font-bold text-[var(--theme-text-primary)]">{{ selectedNode.label }}</h2>
              <span v-if="selectedNode.badge" class="px-1.5 py-0.5 text-[10px] font-mono-data bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)]">{{ selectedNode.badge }} items</span>
            </div>

            <div v-if="selectedNode.children" class="space-y-2 mt-4">
              <button
                v-for="child in selectedNode.children"
                :key="child.id"
                @click="navigate(child.id)"
                class="w-full text-left p-3 border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] hover:border-[var(--theme-border-secondary)] transition-colors flex items-center gap-3"
              >
                <span class="text-sm">{{ child.icon }}</span>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-semibold text-[var(--theme-text-primary)] truncate">{{ child.label }}</div>
                </div>
                <svg class="w-3.5 h-3.5 text-[var(--theme-text-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </template>

        <!-- Item detail view -->
        <template v-else-if="selectedNode.type === 'item'">
          <div class="max-w-2xl">
            <!-- ── Skill detail ── -->
            <template v-if="isSkillNode">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-lg">{{ skillData!.type === 'agent' ? '\u{1F916}' : skillData!.type === 'command' ? '\u{1F4AC}' : '\u26A1' }}</span>
                <h2 class="text-base font-bold text-[var(--theme-text-primary)]">{{ skillData!.name }}</h2>
              </div>
              <div class="flex items-center gap-2 mb-4 flex-wrap">
                <span class="px-1.5 py-0.5 text-[9px] font-mono-data uppercase bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] border border-[var(--theme-border-primary)]">
                  {{ skillData!.pluginName }}
                </span>
                <span
                  v-if="skillData!.type"
                  class="px-1.5 py-0.5 text-[9px] font-mono-data uppercase border"
                  :class="skillData!.type === 'agent' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : skillData!.type === 'command' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'"
                >{{ skillData!.type }}</span>
                <span v-if="skillData!.author" class="text-[10px] text-[var(--theme-text-tertiary)]">by {{ skillData!.author }}</span>
              </div>

              <div class="p-4 border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] mb-3">
                <div class="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--theme-text-tertiary)] mb-2">Description</div>
                <p class="text-sm text-[var(--theme-text-secondary)] leading-relaxed">
                  {{ skillData!.description || 'No description provided.' }}
                </p>
              </div>

              <div class="p-4 border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]">
                <div class="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--theme-text-tertiary)] mb-2">Usage</div>
                <div class="font-mono-data text-xs text-[var(--theme-primary)] bg-[var(--theme-bg-tertiary)] px-3 py-2">
                  {{ skillData!.type === 'command' ? '/' + skillData!.pluginName + ':' + skillData!.name : skillData!.type === 'agent' ? 'Task agent: ' + skillData!.pluginName + ':' + skillData!.name : '/' + skillData!.name }}
                </div>
              </div>
            </template>

            <!-- ── MCP Server detail ── -->
            <template v-else-if="isMcpNode">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-lg">&zwnj;&#11041;</span>
                <h2 class="text-base font-bold text-[var(--theme-text-primary)]">{{ mcpData!.name }}</h2>
                <span
                  class="px-1.5 py-0.5 text-[9px] font-mono-data uppercase border"
                  :class="badgeClass(mcpData!.transport === 'stdio' ? 'green' : mcpData!.transport === 'sse' ? 'blue' : 'yellow')"
                >{{ mcpData!.transport }}</span>
              </div>

              <div class="space-y-3 mt-4">
                <div v-if="mcpData!.command" class="p-4 border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]">
                  <div class="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--theme-text-tertiary)] mb-2">Command</div>
                  <div class="font-mono-data text-xs text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] px-3 py-2 break-all">
                    {{ mcpData!.command }}
                  </div>
                </div>

                <div v-if="mcpData!.args && mcpData!.args.length > 0" class="p-4 border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]">
                  <div class="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--theme-text-tertiary)] mb-2">Arguments</div>
                  <div class="space-y-1">
                    <div
                      v-for="(arg, i) in mcpData!.args"
                      :key="i"
                      class="font-mono-data text-xs text-[var(--theme-text-secondary)] bg-[var(--theme-bg-tertiary)] px-3 py-1.5 break-all"
                    >{{ arg }}</div>
                  </div>
                </div>

                <div v-if="mcpData!.url" class="p-4 border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]">
                  <div class="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--theme-text-tertiary)] mb-2">URL</div>
                  <div class="font-mono-data text-xs text-[var(--theme-primary)] bg-[var(--theme-bg-tertiary)] px-3 py-2 break-all">
                    {{ mcpData!.url }}
                  </div>
                </div>

                <div class="p-4 border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]">
                  <div class="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--theme-text-tertiary)] mb-2">Configuration</div>
                  <p class="text-xs text-[var(--theme-text-secondary)] leading-relaxed">
                    Defined in <span class="font-mono-data text-[var(--theme-primary)]">~/.claude/settings.json</span> under <span class="font-mono-data text-[var(--theme-primary)]">mcpServers.{{ mcpData!.name }}</span>
                  </p>
                </div>
              </div>
            </template>

            <!-- ── Marketplace entry detail ── -->
            <template v-else-if="isMarketplaceNode">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-lg">{{ marketplaceData!.category === 'registry' ? '\u25C8' : '\u2605' }}</span>
                <h2 class="text-base font-bold text-[var(--theme-text-primary)]">{{ marketplaceData!.name }}</h2>
                <span class="px-1.5 py-0.5 text-[9px] font-mono-data uppercase bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] border border-[var(--theme-border-primary)]">
                  {{ marketplaceData!.category }}
                </span>
              </div>

              <div class="space-y-3 mt-4">
                <div class="p-4 border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]">
                  <div class="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--theme-text-tertiary)] mb-2">Description</div>
                  <p class="text-sm text-[var(--theme-text-secondary)] leading-relaxed">{{ marketplaceData!.description }}</p>
                </div>

                <div class="p-4 border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]">
                  <div class="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--theme-text-tertiary)] mb-2">URL</div>
                  <a
                    :href="marketplaceData!.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="font-mono-data text-xs text-[var(--theme-primary)] hover:underline break-all"
                  >{{ marketplaceData!.url }}</a>
                </div>

                <a
                  :href="marketplaceData!.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-2 px-4 py-2 border border-[var(--theme-primary)] text-[var(--theme-primary)] text-sm font-semibold hover:bg-[var(--theme-primary)]/10 transition-colors"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Open in Browser
                </a>
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useToolkit, SECTION_DOCS, type SkillInfo, type McpServerInfo, type MarketplaceEntry } from '../composables/useToolkit';

const {
  loading, refresh,
  tree, selectedNodeId, selectedNode, breadcrumb,
  navigate, toggleSection, isExpanded,
} = useToolkit();

// Section click: select + toggle expand
function handleSectionClick(id: string) {
  navigate(id);
  toggleSection(id);
}

// Group click: select + toggle expand
function handleGroupClick(id: string) {
  navigate(id);
  toggleSection(id);
}

// Section documentation for the currently selected section
const sectionDoc = computed(() => {
  if (!selectedNode.value || selectedNode.value.type !== 'section') return null;
  return SECTION_DOCS[selectedNode.value.id] || null;
});

// Type guards for item detail views
const isSkillNode = computed(() =>
  selectedNode.value?.type === 'item' && selectedNode.value.id.startsWith('skill:')
);
const isMcpNode = computed(() =>
  selectedNode.value?.type === 'item' && selectedNode.value.id.startsWith('mcp:')
);
const isMarketplaceNode = computed(() =>
  selectedNode.value?.type === 'item' && selectedNode.value.id.startsWith('marketplace:')
);

// Typed data accessors
const skillData = computed<SkillInfo | null>(() =>
  isSkillNode.value ? (selectedNode.value?.data as SkillInfo) : null
);
const mcpData = computed<McpServerInfo | null>(() =>
  isMcpNode.value ? (selectedNode.value?.data as McpServerInfo) : null
);
const marketplaceData = computed<MarketplaceEntry | null>(() =>
  isMarketplaceNode.value ? (selectedNode.value?.data as MarketplaceEntry) : null
);

// Badge color classes
function badgeClass(color?: string): string {
  switch (color) {
    case 'green': return 'bg-green-500/10 text-green-400 border-green-500/30';
    case 'blue': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'yellow': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    default: return 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] border-[var(--theme-border-primary)]';
  }
}
</script>
