"""Conservative structural lint for untrusted equation LaTeX.

The browser (KaTeX strict mode with trust disabled) remains the rendering
authority; this lint exists so the classes of equation KaTeX rejects —
unknown commands, unbalanced groups, unpaired ``\\left``, math-mode dollars,
and forbidden commands — trigger repair on the backend instead of a dropped
op in the browser. The contract is pinned by
``shared/fixtures/latex-parity.json``. A false reject only costs a repair
rewrite; a false accept only costs one browser-dropped op.
"""

from __future__ import annotations

import re

# Mirrors FORBIDDEN_LATEX_COMMAND in frontend/src/board/latex.ts.
_FORBIDDEN_COMMAND = re.compile(
    r"\\(?:href|url|includegraphics|html[a-z]*|class|style|gdef|def|newcommand|renewcommand)\b",
    re.IGNORECASE,
)
_COMMAND = re.compile(r"\\([a-zA-Z]+)")
_LEFT_RIGHT = re.compile(r"\\(left|right)(?![a-zA-Z])")

_ALLOWED_COMMANDS = frozenset(
    {
        # Structure and spacing
        "frac",
        "dfrac",
        "tfrac",
        "sqrt",
        "left",
        "right",
        "quad",
        "qquad",
        "text",
        "mathrm",
        "mathbf",
        "mathbb",
        "mathcal",
        "operatorname",
        "overline",
        "underline",
        "overbrace",
        "underbrace",
        "boxed",
        # Functions
        "sin",
        "cos",
        "tan",
        "sec",
        "csc",
        "cot",
        "arcsin",
        "arccos",
        "arctan",
        "sinh",
        "cosh",
        "tanh",
        "ln",
        "log",
        "exp",
        "lim",
        "max",
        "min",
        "sum",
        "prod",
        "int",
        "oint",
        # Greek letters
        "alpha",
        "beta",
        "gamma",
        "delta",
        "epsilon",
        "varepsilon",
        "zeta",
        "eta",
        "theta",
        "vartheta",
        "iota",
        "kappa",
        "lambda",
        "mu",
        "nu",
        "xi",
        "pi",
        "rho",
        "sigma",
        "tau",
        "upsilon",
        "phi",
        "varphi",
        "chi",
        "psi",
        "omega",
        "Gamma",
        "Delta",
        "Theta",
        "Lambda",
        "Xi",
        "Pi",
        "Sigma",
        "Upsilon",
        "Phi",
        "Psi",
        "Omega",
        # Accents and vectors
        "vec",
        "hat",
        "bar",
        "dot",
        "ddot",
        "tilde",
        "overrightarrow",
        "overleftarrow",
        # Relations and operators
        "cdot",
        "times",
        "div",
        "pm",
        "mp",
        "leq",
        "geq",
        "neq",
        "approx",
        "sim",
        "simeq",
        "equiv",
        "propto",
        "infty",
        "partial",
        "nabla",
        "degree",
        "circ",
        "prime",
        "perp",
        "parallel",
        "angle",
        # Arrows and dots
        "to",
        "rightarrow",
        "Rightarrow",
        "leftarrow",
        "Leftarrow",
        "leftrightarrow",
        "Leftrightarrow",
        "mapsto",
        "implies",
        "iff",
        "dots",
        "ldots",
        "cdots",
        "vdots",
        "ddots",
    }
)


def lint_equation_latex(latex: str) -> list[str]:
    """Return bounded repair-safe issues; an empty list means lint passes."""

    issues: list[str] = []
    if _FORBIDDEN_COMMAND.search(latex):
        issues.append("equation uses a forbidden latex command")
    if _contains_unescaped_dollar(latex):
        issues.append("equation must not contain $; it is already rendered in math mode")
    if not _braces_balanced(latex):
        issues.append("equation braces are unbalanced")
    if not _left_right_paired(latex):
        issues.append("equation \\left has no matching \\right")
    for command in _COMMAND.findall(latex):
        if command not in _ALLOWED_COMMANDS:
            issues.append(f"unknown latex command \\{command}")
            break
    return issues


def _contains_unescaped_dollar(latex: str) -> bool:
    previous_was_escape = False
    for character in latex:
        if previous_was_escape:
            previous_was_escape = False
            continue
        if character == "\\":
            previous_was_escape = True
            continue
        if character == "$":
            return True
    return False


def _braces_balanced(latex: str) -> bool:
    depth = 0
    previous_was_escape = False
    for character in latex:
        if previous_was_escape:
            previous_was_escape = False
            continue
        if character == "\\":
            previous_was_escape = True
            continue
        if character == "{":
            depth += 1
        elif character == "}":
            depth -= 1
            if depth < 0:
                return False
    return depth == 0


def _left_right_paired(latex: str) -> bool:
    depth = 0
    for match in _LEFT_RIGHT.finditer(latex):
        depth += 1 if match.group(1) == "left" else -1
        if depth < 0:
            return False
    return depth == 0
