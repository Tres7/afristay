import { Fragment } from "react";

/** Mise en forme légère des réponses du Concierge (paragraphes, listes, **gras**), sans HTML injecté. */
function enLigne(texte: string) {
  return texte.split(/(\*\*[^*]+\*\*)/g).map((morceau, i) =>
    morceau.startsWith("**") && morceau.endsWith("**") && morceau.length > 4
      ? <strong key={i} className="font-semibold">{morceau.slice(2, -2)}</strong>
      : <Fragment key={i}>{morceau}</Fragment>,
  );
}

export default function TexteConcierge({ texte }: { texte: string }) {
  const blocs = texte.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className="space-y-2.5 leading-relaxed">
      {blocs.map((bloc, i) => {
        const lignes = bloc.split("\n").filter((l) => l.trim());
        const puces = lignes.length > 0 && lignes.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l));
        if (puces) {
          const numerotee = /^\s*\d+[.)]/.test(lignes[0]);
          const Liste = numerotee ? "ol" : "ul";
          return (
            <Liste key={i} className={numerotee ? "list-decimal pl-5 space-y-1" : "list-disc pl-5 space-y-1"}>
              {lignes.map((l, j) => <li key={j}>{enLigne(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>)}
            </Liste>
          );
        }
        const titre = /^#{1,4}\s+/.test(bloc);
        if (titre) return <p key={i} className="font-heading font-bold">{enLigne(bloc.replace(/^#{1,4}\s+/, ""))}</p>;
        return (
          <p key={i}>
            {lignes.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{enLigne(l)}</Fragment>)}
          </p>
        );
      })}
    </div>
  );
}
