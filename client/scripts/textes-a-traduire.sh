#!/usr/bin/env bash
# Repère les lignes contenant probablement du texte affiché en français (aide à l'extraction i18n)
for f in "$@"; do
  echo "=== $f"
  grep -nE '[éèàçêôûÉÀ]|"[A-Z][a-z]+[ ,.!?]|>[A-Z][a-zé]|^\s+[A-ZÀ-Ý][a-zà-ÿ’'"'"']+[ ,.!?:]|aria-label="|placeholder="|label="|title="|hint="|toast\.|toLocale|"fr-FR"' "$f" \
    | grep -vE '^\s*[0-9]+:\s*(//|\*|/\*|\{/\*)|^[0-9]+:import|className="[^"]*"$|t\("' 
done
