"""Line icons for project types (24x24, stroke-based, drawn for this site).

Each value is the inner SVG markup; `svg()` wraps it in a standard <svg> element
that inherits its colour from CSS (stroke="currentColor").
"""

ICONS = {
    # single cell: membrane, nucleus, a few transcripts
    "single-cell": '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/>'
                   '<path d="M6.8 8.2h.01M17 9.5h.01M8 16.5h.01M16.2 15.8h.01" stroke-width="2.6" stroke-linecap="round"/>',
    # bulk: test tube with liquid
    "bulk": '<path d="M9 3h6M10 3v14.5a2 2 0 0 0 4 0V3"/><path d="M10 11h4"/>'
            '<path d="M5 21h14" opacity=".55"/>',
    # DNA double helix
    "dna": '<path d="M7 3c0 6 10 6 10 12s-10 6-10 6"/><path d="M17 3c0 6-10 6-10 12"/>'
           '<path d="M9 6.5h6M9 17.5h6M10.2 9.5h3.6"/>',
    # protein: folded chain of residues
    "protein": '<circle cx="6" cy="7" r="2"/><circle cx="13" cy="5" r="2"/><circle cx="18" cy="11" r="2"/>'
               '<circle cx="12" cy="15" r="2"/><circle cx="7" cy="19" r="2"/>'
               '<path d="M8 6.4l3-.8M14.4 6.5l2.3 2.9M16.3 12.1l-2.6 2M10.5 16.3l-2.2 1.6"/>',
    # Erlenmeyer flask
    "flask": '<path d="M9 3h6M10 3v6.2L4.6 18.4A1.8 1.8 0 0 0 6.2 21h11.6a1.8 1.8 0 0 0 1.6-2.6L14 9.2V3"/>'
             '<path d="M7 15h10"/>',
    # stacked layers
    "layers": '<path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M3 12l9 4.5 9-4.5"/><path d="M3 16.5L12 21l9-4.5"/>',
    # cell painting: imaging field with stained cells
    "cell-painting": '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9.5" r="3"/>'
                     '<circle cx="15.8" cy="14.8" r="2.6"/><circle cx="8.2" cy="16.6" r="1.6"/>'
                     '<path d="M9 9.5h.01M15.8 14.8h.01" stroke-width="2.4" stroke-linecap="round"/>',
    # microscope
    "microscope": '<path d="M6 21h12"/><path d="M8 17.5h6"/><path d="M14.5 21a6.5 6.5 0 0 0-1.6-11.3"/>'
                  '<path d="M9.2 3.6l3.4 2-3.5 6-3.4-2z"/><path d="M8.2 12.3L7 14.4"/>',
    # 96-well plate
    "plate": '<rect x="3" y="5" width="18" height="14" rx="2"/>'
             '<path d="M7 9h.01M10.3 9h.01M13.7 9h.01M17 9h.01M7 12h.01M10.3 12h.01M13.7 12h.01M17 12h.01'
             'M7 15h.01M10.3 15h.01M13.7 15h.01M17 15h.01" stroke-width="2.4" stroke-linecap="round"/>',
    # neural network
    "network": '<circle cx="5" cy="7" r="1.8"/><circle cx="5" cy="17" r="1.8"/><circle cx="12" cy="5" r="1.8"/>'
               '<circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/><circle cx="19" cy="12" r="1.8"/>'
               '<path d="M6.7 6.5l3.6-1M6.7 7.8l3.7 3.2M6.6 16.1l3.8-3.2M6.7 17.6l3.6 1M13.8 5.8l3.7 5M13.8 12h3.4M13.8 18.2l3.7-5"/>',
    # server rack
    "server": '<rect x="3.5" y="4" width="17" height="7" rx="1.5"/><rect x="3.5" y="13" width="17" height="7" rx="1.5"/>'
              '<path d="M7 7.5h.01M7 16.5h.01" stroke-width="2.6" stroke-linecap="round"/><path d="M11 7.5h6M11 16.5h6"/>',
    # open book
    "book": '<path d="M12 6.5C10 5 7.2 4.5 3.5 4.8v13.4c3.7-.3 6.5.2 8.5 1.8 2-1.6 4.8-2.1 8.5-1.8V4.8C16.8 4.5 14 5 12 6.5z"/>'
            '<path d="M12 6.5V20"/>',
    # report / document
    "report": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'
              '<path d="M8.5 13h7M8.5 16.5h5"/>',
    # tag (unclassified)
    "tag": '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.4 6.4a1.5 1.5 0 0 1-2.1 0z"/>'
           '<path d="M8 8h.01" stroke-width="2.8" stroke-linecap="round"/>',
    # all repositories
    "grid": '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/>'
            '<rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
}


def svg(name, size=24):
    inner = ICONS.get(name, ICONS["tag"])
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="{size}" height="{size}" '
            f'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" '
            f'stroke-linejoin="round" aria-hidden="true">{inner}</svg>')
