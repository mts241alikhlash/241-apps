import path from 'node:path'

export function referencedServices(source, known) {
  const found = new Set()
  for (const match of source.matchAll(/\b([A-Z]+)_SERVICE_URL\b/gu)) {
    const name = match[1].toLowerCase()
    if (known.includes(name)) found.add(name)
  }
  return [...found]
}

export function withDependencies(start, next) {
  const all = new Set(start)
  const queue = [...start]
  while (queue.length > 0) {
    for (const dependency of next(queue.shift())) {
      if (all.has(dependency)) continue
      all.add(dependency)
      queue.push(dependency)
    }
  }
  return all
}

export function ownedByWorkspace(cwd, workspace) {
  const relative = path.relative(workspace, cwd)
  if (relative.startsWith('..') || path.isAbsolute(relative)) return false
  return relative.split(path.sep)[0] !== '.worktrees'
}
