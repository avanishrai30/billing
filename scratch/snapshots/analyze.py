import os
import re

snapshots = [
    "baseline.html",
    "stage-c.html",
    "stage-d.html",
    "stage-e.html",
    "stage-f.html",
    "stage-g.html",
    "current.html"
]

def extract_css(content):
    css_blocks = re.findall(r'<style[^>]*>(.*?)</style>', content, re.DOTALL)
    css_content = '\n'.join(css_blocks)
    rules = {}
    
    # simplified parsing for specific classes/ids
    targets = ['.app-view', '.app-container', 'main', '#login-screen-overlay', '.login-card', 'body']
    
    # This regex is a bit naive but works for standard formatted CSS
    for target in targets:
        # Escape for regex if needed, e.g., dots
        t_re = target.replace('.', r'\.').replace('#', r'\#')
        pattern = re.compile(rf'{t_re}\s*{{([^}}]+)}}', re.MULTILINE)
        matches = pattern.findall(css_content)
        if matches:
            rules[target] = matches[0].strip()
            
    # look for position: fixed or absolute
    pos_rules = []
    for match in re.finditer(r'([^{]+)\s*{[^}]*position:\s*(fixed|absolute)[^}]*}', css_content):
        pos_rules.append(match.group(1).strip())
        
    return rules, set(pos_rules)

def extract_js_functions(content):
    funcs = ['syncStateWithServer', 'initAuthentication', 'triggerLogin', 'switchView', 'loadDatabaseState']
    extracted = {}
    for f in funcs:
        pattern = re.compile(rf'function\s+{f}\s*\([^)]*\)\s*{{', re.MULTILINE)
        match = pattern.search(content)
        if match:
            extracted[f] = "Present" # in a real scenario we might extract body
        else:
            extracted[f] = "Missing"
            
    # Also find if syncStateWithServer has new render functions
    # syncStateWithServer block:
    sync_block = ""
    match = re.search(r'function\s+syncStateWithServer\s*\([^)]*\)\s*{(.*?)\n\s*}', content, re.DOTALL)
    if match:
        sync_block = match.group(1)
        
    render_calls = re.findall(r'render[A-Za-z0-9_]+\(', sync_block)
    
    return extracted, set(render_calls)

def extract_dom(content):
    views = re.findall(r'<div[^>]*class="[^"]*\bapp-view\b[^"]*"[^>]*id="([^"]+)"', content)
    overlays = re.findall(r'<div[^>]*id="([^"]*overlay[^"]*)"', content)
    return set(views), set(overlays)

results = {}
for snap in snapshots:
    if os.path.exists(snap):
        with open(snap, 'r') as f:
            content = f.read()
            css_rules, pos_rules = extract_css(content)
            js_funcs, render_calls = extract_js_functions(content)
            views, overlays = extract_dom(content)
            results[snap] = {
                'css_rules': css_rules,
                'pos_rules': pos_rules,
                'js_funcs': js_funcs,
                'render_calls': render_calls,
                'views': views,
                'overlays': overlays
            }

with open("agent5_stage_diffs.md", "w") as out:
    out.write("# Stage-by-Stage Diff Analysis\n\n")
    for i in range(len(snapshots)-1):
        s1, s2 = snapshots[i], snapshots[i+1]
        out.write(f"## {s1} -> {s2}\n\n")
        if s1 not in results or s2 not in results:
            out.write("Data missing.\n\n")
            continue
            
        r1, r2 = results[s1], results[s2]
        
        out.write("### 1. Global CSS Changes\n")
        for k in r1['css_rules'].keys() | r2['css_rules'].keys():
            v1 = r1['css_rules'].get(k, 'Not Present')
            v2 = r2['css_rules'].get(k, 'Not Present')
            if v1 != v2:
                out.write(f"- `{k}` changed.\n")
        new_pos = r2['pos_rules'] - r1['pos_rules']
        if new_pos:
            out.write(f"- New absolute/fixed positioned elements: {', '.join(new_pos)}\n")
            
        out.write("\n### 2. Initialization Changes\n")
        for k in r1['js_funcs'].keys() | r2['js_funcs'].keys():
            v1 = r1['js_funcs'].get(k)
            v2 = r2['js_funcs'].get(k)
            if v1 != v2:
                out.write(f"- `{k}` status changed: {v1} -> {v2}\n")
                
        out.write("\n### 3. View Structure Changes\n")
        new_views = r2['views'] - r1['views']
        if new_views:
            out.write(f"- New `.app-view` sections: {', '.join(new_views)}\n")
        new_overlays = r2['overlays'] - r1['overlays']
        if new_overlays:
            out.write(f"- New overlays: {', '.join(new_overlays)}\n")
            
        out.write("\n### 4. Render Function Changes\n")
        new_renders = r2['render_calls'] - r1['render_calls']
        if new_renders:
            out.write(f"- New render functions in syncStateWithServer: {', '.join(new_renders)}\n")
            
        out.write("\n### RISK ASSESSMENT\n")
        out.write("Potential risk of blank workspace or missing login card based on CSS/DOM changes.\n\n")

print("Analysis written.")
