+++
title = "AI-governance review triggers — demo"
description = "Click-through demo of an AI governance workspace for a fictional bank: simulate a regulation, data source, model or organisational change and see which records need review."
template = "ai-review-triggers.html"

# Read by templates/ai-review-triggers.html. The workspace content lives in the
# TOML files next to this file:
#   inventory.toml   AI systems and vendors
#   governance.toml  policies, assessments, risks, measures, regulations, review triggers
#   tasks.toml       tasks (including the ones each simulated change creates)
#   scenarios.toml   the five simulated changes
# The Markdown below the front matter is the "About this demo" text on the dashboard.

[extra]
product_name = "AI Review Demo"   # descriptive label for this fictional demo
tenant = "Banco Salamanca"
tenant_initials = "BS"
user_initials = "CO"
demo_note = "Fictional demonstration · not legal advice. No real records are changed."
+++

Banco Salamanca is a fictional bank. This is its AI governance workspace: AI systems, policies, assessments, risks and tasks, all built from one case description. Click through freely; nothing can be changed. Then press **Simulate a change** at the top and pick one of five events, such as a new data source or a model update. You will see which review trigger fires, which records it flags, which it leaves alone, and which tasks it creates.
