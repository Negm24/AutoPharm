from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor


ROOT = Path("D:/Projects/AutoPharm")
DOCS = ROOT / "docs"
IMAGES = DOCS / "diagrams" / "rendered"
OUTPUT = DOCS / "AutoPharm-Backend-Architecture.docx"

NAVY = "172554"
BLUE = "2563EB"
PALE_BLUE = "EAF2FF"
PALE_GREEN = "ECFDF3"
PALE_GRAY = "F6F7F9"
MID_GRAY = "6B7280"
LIGHT_BORDER = "D9DDE5"
BLACK = "000000"
WHITE = "FFFFFF"


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shading = tc_pr.find(qn("w:shd"))
    if shading is None:
        shading = OxmlElement("w:shd")
        tc_pr.append(shading)
    shading.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=100, start=120, bottom=100, end=120) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_borders(table, color: str = LIGHT_BORDER, size: str = "6") -> None:
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        node = borders.find(qn(f"w:{edge}"))
        if node is None:
            node = OxmlElement(f"w:{edge}")
            borders.append(node)
        node.set(qn("w:val"), "single")
        node.set(qn("w:sz"), size)
        node.set(qn("w:color"), color)


def set_repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_run_font(run, name="Aptos", size=None, bold=None, color=BLACK) -> None:
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), name)
    run.font.color.rgb = RGBColor.from_string(color)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold


def set_paragraph_keep(paragraph, keep_next=False, keep_lines=True) -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    if keep_next:
        p_pr.append(OxmlElement("w:keepNext"))
    if keep_lines:
        p_pr.append(OxmlElement("w:keepLines"))


def add_page_number(paragraph) -> None:
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Page ")
    set_run_font(run, size=9, color=MID_GRAY)
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = "PAGE"
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = "1"
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.extend([begin, instr, separate, text, end])


def configure_section(section, landscape=False) -> None:
    if landscape:
        section.orientation = WD_ORIENT.LANDSCAPE
        section.page_width = Cm(29.7)
        section.page_height = Cm(21.0)
        section.top_margin = Cm(1.35)
        section.bottom_margin = Cm(1.35)
        section.left_margin = Cm(1.45)
        section.right_margin = Cm(1.45)
    else:
        section.orientation = WD_ORIENT.PORTRAIT
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
        section.top_margin = Cm(1.8)
        section.bottom_margin = Cm(1.7)
        section.left_margin = Cm(2.0)
        section.right_margin = Cm(2.0)


def add_heading(doc, text: str, level: int = 1):
    paragraph = doc.add_heading(text, level=level)
    set_paragraph_keep(paragraph, keep_next=True)
    return paragraph


def add_body(doc, text: str, bold_lead: str | None = None):
    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(7)
    paragraph.paragraph_format.line_spacing = 1.12
    if bold_lead:
        lead = paragraph.add_run(bold_lead)
        set_run_font(lead, bold=True)
    run = paragraph.add_run(text)
    set_run_font(run)
    return paragraph


def add_bullet(doc, text: str, level: int = 0):
    style = "List Bullet" if level == 0 else "List Bullet 2"
    paragraph = doc.add_paragraph(style=style)
    paragraph.paragraph_format.space_after = Pt(4)
    paragraph.paragraph_format.line_spacing = 1.08
    run = paragraph.add_run(text)
    set_run_font(run)
    return paragraph


def add_numbered(doc, text: str):
    paragraph = doc.add_paragraph(style="List Number")
    paragraph.paragraph_format.space_after = Pt(5)
    run = paragraph.add_run(text)
    set_run_font(run)
    return paragraph


def add_table(doc, headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table)
    header = table.rows[0]
    set_repeat_table_header(header)
    for index, text in enumerate(headers):
        cell = header.cells[index]
        set_cell_shading(cell, NAVY)
        set_cell_margins(cell)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        paragraph = cell.paragraphs[0]
        paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = paragraph.add_run(text)
        set_run_font(run, size=9.5, bold=True, color=WHITE)
        if widths:
            cell.width = widths[index]
    for row_index, values in enumerate(rows):
        cells = table.add_row().cells
        for column_index, value in enumerate(values):
            cell = cells[column_index]
            set_cell_shading(cell, "FFFFFF" if row_index % 2 == 0 else PALE_BLUE)
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            paragraph = cell.paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(0)
            paragraph.paragraph_format.line_spacing = 1.05
            run = paragraph.add_run(str(value))
            set_run_font(run, size=9.2)
            if widths:
                cell.width = widths[column_index]
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


def add_figure(doc, image_path: Path, width: Inches, caption: str, alt_text: str) -> None:
    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_after = Pt(5)
    set_paragraph_keep(paragraph, keep_next=True)
    run = paragraph.add_run()
    inline_shape = run.add_picture(str(image_path), width=width)
    doc_pr = inline_shape._inline.docPr
    doc_pr.set("descr", alt_text)
    caption_paragraph = doc.add_paragraph(style="Caption")
    caption_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    caption_paragraph.paragraph_format.space_after = Pt(9)
    caption_run = caption_paragraph.add_run(caption)
    set_run_font(caption_run, size=9.2, color=MID_GRAY)


doc = Document()
configure_section(doc.sections[0], landscape=False)

# Global styles
normal = doc.styles["Normal"]
normal.font.name = "Aptos"
normal._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
normal.font.size = Pt(10.5)
normal.font.color.rgb = RGBColor.from_string(BLACK)

title_style = doc.styles["Title"]
title_style.font.name = "Aptos Display"
title_style._element.rPr.rFonts.set(qn("w:ascii"), "Aptos Display")
title_style._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos Display")
title_style.font.size = Pt(30)
title_style.font.bold = True
title_style.font.color.rgb = RGBColor.from_string(BLACK)

for style_name, size in (("Heading 1", 19), ("Heading 2", 14), ("Heading 3", 11.5)):
    style = doc.styles[style_name]
    style.font.name = "Aptos Display"
    style._element.rPr.rFonts.set(qn("w:ascii"), "Aptos Display")
    style._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos Display")
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = RGBColor.from_string(BLACK)
    style.paragraph_format.space_before = Pt(12 if style_name == "Heading 1" else 9)
    style.paragraph_format.space_after = Pt(5)

caption_style = doc.styles["Caption"]
caption_style.font.name = "Aptos"
caption_style.font.size = Pt(9.2)
caption_style.font.italic = True
caption_style.font.color.rgb = RGBColor.from_string(MID_GRAY)

footer = doc.sections[0].footer
footer.is_linked_to_previous = False
footer_paragraph = footer.paragraphs[0]
footer_paragraph.add_run("AutoPharm Backend Architecture   |   ")
for run in footer_paragraph.runs:
    set_run_font(run, size=9, color=MID_GRAY)
add_page_number(footer_paragraph)

# Cover page
doc.add_paragraph().paragraph_format.space_after = Pt(42)
title = doc.add_paragraph(style="Title")
title.alignment = WD_ALIGN_PARAGRAPH.LEFT
title.add_run("AutoPharm Backend Architecture and First Implementation Plan")

subtitle = doc.add_paragraph()
subtitle.paragraph_format.space_before = Pt(6)
subtitle.paragraph_format.space_after = Pt(24)
run = subtitle.add_run("Team discussion document")
set_run_font(run, size=15, color=MID_GRAY)

meta = doc.add_paragraph()
meta.paragraph_format.space_after = Pt(26)
for line in (
    "Prepared for the AutoPharm development team",
    "Architecture version 1.0",
    "19 September 2026",
):
    run = meta.add_run(line)
    set_run_font(run, size=10.5, color=MID_GRAY)
    run.add_break()

add_heading(doc, "Purpose", level=1)
add_body(
    doc,
    "This document turns the agreed Markdown architecture into a shared implementation plan. "
    "It explains how the Django backend will be organized, how the applications directory will grow, "
    "how responsibilities flow through each domain app, and what the first authentication increment contains.",
)

add_body(
    doc,
    "Build one Django modular monolith. Begin with the accounts domain and add new feature-owned apps incrementally. "
    "Each app owns its API, services, models, migrations, security rules where applicable, and tests.",
    bold_lead="Main decision. ",
)

page_break = doc.add_paragraph()
page_break.add_run().add_break(WD_BREAK.PAGE)

# Architecture summary
add_heading(doc, "1 Agreed architecture", level=1)
add_body(
    doc,
    "The backend will preserve the clear separation familiar from Flask projects while following Django conventions. "
    "The central difference is that code is grouped by business domain instead of being split globally into models, routes, and services.",
)

for item in (
    "One Django project deployed as a modular monolith.",
    "PostgreSQL is the authoritative relational database and is accessed through the Django ORM.",
    "Django REST Framework provides the HTTP API used by the kiosk and AutoDoc.",
    "API views remain thin; named services coordinate business workflows and database transactions.",
    "Django apps own their models, migrations, API code, services, and tests.",
    "External providers and hardware are introduced later through focused adapter interfaces.",
    "Dependencies are declared in pyproject.toml and locked in uv.lock.",
):
    add_bullet(doc, item)

add_heading(doc, "Flask concepts mapped to Django", level=2)
add_table(
    doc,
    ["Flask approach", "Django approach", "AutoPharm decision"],
    [
        ("SQLAlchemy models", "Django ORM models", "Models stay inside their owning domain app."),
        ("Flask Migrate and Alembic", "Django migrations", "Migration files live inside each app and are committed."),
        ("Blueprint routes", "App urls.py plus DRF views", "Routes use /api/v1 and call thin views."),
        ("Marshmallow schemas", "DRF serializers", "Serializers validate API input and output."),
        ("App factory", "Settings plus ASGI or WSGI", "Django initializes installed apps and infrastructure."),
        ("config.py", "config/settings package", "Separate base, local, test, and production settings."),
        ("run.py", "manage.py and ASGI or WSGI", "Local commands use manage.py; deployment uses ASGI or WSGI."),
        ("pip freeze", "pyproject.toml plus uv.lock", "Direct dependencies remain intentional and installs reproducible."),
    ],
    widths=[Inches(1.55), Inches(1.75), Inches(3.15)],
)

add_heading(doc, "2 Repository structure and incremental growth", level=1)
add_body(
    doc,
    "The repository begins with one implemented domain app: accounts. Planned domains appear under the same apps directory as their requirements are implemented. "
    "Existing apps do not need to be reorganized when a new domain is added.",
)

# Landscape section for Figure 1
section = doc.add_section(WD_SECTION.NEW_PAGE)
configure_section(section, landscape=True)
section.footer.is_linked_to_previous = True

add_heading(doc, "Repository structure and app growth", level=1)
add_body(
    doc,
    "Green nodes are part of the first implementation. Gray dashed nodes indicate planned growth. Blue nodes form the stable project foundation.",
)
add_figure(
    doc,
    IMAGES / "backend-repository-growth.png",
    Inches(10.1),
    "Figure 1  Backend repository structure and incremental application growth",
    "Diagram showing the Django backend folder structure, the current accounts application, its owned subfolders, and future clinical, commerce, and operations applications.",
)
add_body(
    doc,
    "The important ownership rule is vertical: prescriptions will live in apps/prescriptions with its own models, API, services, migrations, and tests. "
    "It will not be distributed across global models, routes, and services folders.",
    bold_lead="How to read this diagram. ",
)

# Figure 2
doc.add_page_break()
add_heading(doc, "Dependency direction inside each app", level=1)
add_body(
    doc,
    "Every domain app follows the same dependency direction. HTTP code calls a named service; the service applies policy and opens transaction boundaries; models and querysets persist state through the Django ORM.",
)
add_figure(
    doc,
    IMAGES / "domain-app-dependency-direction.png",
    Inches(10.0),
    "Figure 2  Dependency direction used inside every domain app",
    "Diagram showing API code calling application services, services using models and security policies, models using the Django ORM to reach PostgreSQL, future adapters behind interfaces, and app-owned tests verifying each layer.",
)
add_body(
    doc,
    "Dependencies point inward toward the business workflow. PostgreSQL, SMS, email, payments, and hardware must not be called directly from API views. "
    "Tests exercise each boundary at the appropriate level.",
)

# Auth ERD
doc.add_page_break()
add_heading(doc, "Authentication database increment v1.1", level=1)
add_body(
    doc,
    "The first schema increment contains only users and refresh tokens. The user identifier is a readable non-personal primary key such as USR-0000000001, generated atomically by PostgreSQL.",
)
add_figure(
    doc,
    IMAGES / "auth-erd-v1.1.png",
    Inches(9.7),
    "Figure 3  Authentication entity relationship diagram v1.1",
    "Entity relationship diagram for users and refresh tokens, including the user ownership relationship and the refresh token replacement self-reference.",
)

# Return to portrait
section = doc.add_section(WD_SECTION.NEW_PAGE)
configure_section(section, landscape=False)
section.footer.is_linked_to_previous = True

add_heading(doc, "3 First implementation accounts", level=1)
add_body(
    doc,
    "The accounts app is the first complete vertical slice. It owns registration, login, access-token handling, AutoDoc refresh-token rotation, logout, and the persistence model shown in Figure 3.",
)

tree = """apps/accounts/
|-- admin.py
|-- apps.py
|-- managers.py
|-- validators.py
|-- models/
|   |-- __init__.py
|   |-- user.py
|   `-- refresh_token.py
|-- migrations/
|   `-- 0001_initial.py
|-- api/
|   |-- urls.py
|   |-- serializers.py
|   `-- views.py
|-- services/
|   |-- registration.py
|   |-- authentication.py
|   |-- token_issuance.py
|   |-- token_rotation.py
|   `-- logout.py
|-- security/
|   `-- tokens.py
`-- tests/
    |-- test_models.py
    |-- test_registration.py
    |-- test_authentication.py
    |-- test_token_rotation.py
    `-- test_api.py"""

code_paragraph = doc.add_paragraph()
code_paragraph.paragraph_format.left_indent = Cm(0.5)
code_paragraph.paragraph_format.right_indent = Cm(0.5)
code_paragraph.paragraph_format.space_before = Pt(5)
code_paragraph.paragraph_format.space_after = Pt(10)
code_paragraph.paragraph_format.line_spacing = 1.0
set_cell_like = OxmlElement("w:shd")
set_cell_like.set(qn("w:fill"), PALE_GRAY)
code_paragraph._p.get_or_add_pPr().append(set_cell_like)
run = code_paragraph.add_run(tree)
set_run_font(run, name="Cascadia Mono", size=8.7)

add_heading(doc, "Responsibilities", level=2)
add_table(
    doc,
    ["Area", "Owns", "Must not own"],
    [
        ("Models", "Tables, relationships, constraints, query helpers", "HTTP parsing or token responses"),
        ("Migrations", "Versioned schema and data changes", "Untracked manual production edits"),
        ("API", "URLs, serializers, request and response handling", "Complete business workflows"),
        ("Services", "Registration, authentication, token rotation, transactions", "Framework presentation concerns"),
        ("Security", "Access-token claims and refresh-token primitives", "Custom cryptographic algorithms"),
        ("Tests", "Model, service, API, security, and transaction behavior", "Assertions written only to mirror implementation"),
    ],
    widths=[Inches(1.15), Inches(2.75), Inches(2.65)],
)

add_heading(doc, "Authentication behavior", level=2)
add_body(
    doc,
    "Kiosk users authenticate with a four-digit PIN. AutoDoc users authenticate with a normal strong password. Both are stored only as a Django-supported password hash in credential_hash, while credential_kind selects the applicable input policy.",
)
add_bullet(doc, "Kiosk access tokens are short lived, held only in frontend memory, and cannot be refreshed.")
add_bullet(doc, "The frontend displays the inactivity warning and clears state; the backend always enforces token expiry.")
add_bullet(doc, "AutoDoc uses short-lived access tokens plus rotating refresh tokens.")
add_bullet(doc, "Refresh rotation creates the replacement and revokes the old token inside one database transaction.")
add_bullet(doc, "The database stores only a hash of each refresh token, never the raw token.")
add_bullet(doc, "phone_country_code records the selected phone region, while phone_number stores the normalized E.164 value.")

add_heading(doc, "4 Django conventions we will use", level=1)
add_heading(doc, "Configuration", level=2)
add_body(
    doc,
    "The config/settings package replaces the Flask configuration class. base.py holds shared settings; local.py, test.py, and production.py apply environment-specific behavior. "
    "Secrets are read from environment variables. .env remains local and .env.example is committed with placeholders.",
)

add_heading(doc, "Models and migrations", level=2)
add_body(
    doc,
    "Django models are the schema source of truth. makemigrations creates declarative migration files inside the owning app, and migrate applies them to PostgreSQL. "
    "Migration files are reviewed and committed with their model changes.",
)

add_heading(doc, "Security primitives", level=2)
add_body(
    doc,
    "Password and PIN hashing will use Django's maintained hashing framework. Project code may enforce PIN or password policy and coordinate tokens, but it will not implement its own hash algorithms, salts, or timing-safe comparisons.",
)

add_heading(doc, "Dependencies and environments", level=2)
add_body(
    doc,
    "pyproject.toml declares intentional dependencies and uv.lock records exact resolved versions. The local .venv directory is ignored by Git. "
    "The PostgreSQL service runs through Docker Compose, and the same locked dependency set is used by both backend developers and CI.",
)

add_heading(doc, "5 Development workflow", level=1)
for item in (
    "Create or update the relevant Django model inside its owning app.",
    "Run makemigrations for that app and inspect the generated migration.",
    "Use sqlmigrate when the generated SQL needs additional review.",
    "Apply migrations to the local Docker PostgreSQL database.",
    "Implement or update the named service and keep the API view thin.",
    "Add model, service, API, and transaction tests for the changed behavior.",
    "Run formatting, linting, type checks, and tests before opening a pull request.",
    "Commit the model and its migration in the same pull request.",
):
    add_numbered(doc, item)

add_heading(doc, "Testing policy", level=2)
add_body(
    doc,
    "AI agents may help generate test code, but the team defines the expected behavior and reviews the assertions. Tests must not be weakened merely to make an implementation pass.",
)
add_bullet(doc, "App-owned tests live under apps/<domain>/tests.")
add_bullet(doc, "Cross-domain workflows live under backend/tests/integration.")
add_bullet(doc, "Concurrency and transaction tests run against PostgreSQL, not SQLite.")
add_bullet(doc, "Authentication tests cover disabled users, expiry, refresh rotation, replay, and rollback behavior.")

add_heading(doc, "6 Guardrails for the architecture", level=1)
for item in (
    "Do not build global models, routes, and services folders that split one domain across the repository.",
    "Do not create a repository class for every model; use Django managers and querysets unless a real boundary is needed.",
    "Do not hide payment, inventory, prescription, or authentication transitions inside Django signals.",
    "Do not place unrelated helpers in a growing utils module; keep helpers close to the domain that owns them.",
    "Do not let serializers or views contain complete business workflows.",
    "Do not commit .env, .venv, credentials, real patient data, or generated local database files.",
):
    add_bullet(doc, item)

add_heading(doc, "7 Immediate implementation sequence", level=1)
for item in (
    "Initialize the backend Python project with uv and select the supported Django baseline.",
    "Create the Django project configuration and split settings into base, local, test, and production modules.",
    "Connect Django to the Docker PostgreSQL service.",
    "Create the accounts app and configure the custom user model before the first migrate command.",
    "Implement User and RefreshToken models matching authentication ERD v1.1.",
    "Generate and review accounts migration 0001_initial.",
    "Implement registration, authentication, access-token, refresh rotation, and logout services.",
    "Expose the initial /api/v1/auth endpoints through thin DRF views.",
    "Add the accounts test suite and PostgreSQL transaction tests.",
    "Run the complete stack through Docker Compose and prepare the first reviewable pull request.",
):
    add_numbered(doc, item)

add_heading(doc, "Discussion outcome", level=2)
add_body(
    doc,
    "The team should approve the folder ownership model, the dependency direction, authentication ERD v1.1, and the immediate implementation sequence before scaffolding begins. "
    "Later domain apps may add specialized components, but they should preserve these boundaries unless a documented requirement justifies a change.",
)

add_heading(doc, "Source documents", level=2)
for source in (
    "01-requirements.md version 0.6",
    "02-technology-stack.md version 1.2",
    "CONTRIBUTING.md",
    "v_auth_1.1 Mermaid ERD",
    "v_backend_architecture_1.0 Mermaid diagrams",
):
    add_bullet(doc, source)

# Ensure every section uses the same footer and sensible header distance.
for section in doc.sections:
    section.footer_distance = Cm(0.65)
    if section is not doc.sections[0]:
        section.footer.is_linked_to_previous = True

doc.core_properties.title = "AutoPharm Backend Architecture and First Implementation Plan"
doc.core_properties.subject = "Django backend architecture and authentication implementation plan"
doc.core_properties.author = "AutoPharm Development Team"
doc.core_properties.keywords = "AutoPharm, Django, PostgreSQL, architecture, authentication"

doc.save(OUTPUT)
print(OUTPUT)
