"use client";
import { useMemo, useState } from "react";
import {
  Check,
  Crosshair,
  LockKeyhole,
  Shield,
  Swords,
} from "lucide-react";
import { RegionalAtlas } from "../regional-atlas";
import { PokemonSprite } from "../pokemon-sprite";
import { Feedback, RunHud, type GameProps } from "../gameplay";
import { species } from "@/poke/data";
import {
  HABITAT_ROUNDS,
  eligibleRegions,
  habitatRoundsFor,
  habitatSectorProfiles,
  rangerRoundsFor,
  type Biome,
} from "@/poke/regions";
import { seedHash, seededShuffle } from "@/poke/variety";
import { expeditionStarterRoster } from "@/poke/expedition";
import { emitGameFeel } from "../game-feel";
export { BattleCircuit as TypeClashArena } from "./battle-circuit";
export { GymDraftGauntlet } from "./gym-draft-gauntlet";

const biomeCounters: Partial<Record<Biome, string[]>> = {
  cave: ["fighting", "ground", "rock"],
  volcanic: ["water", "ground", "rock"],
  snow: ["fire", "ice", "steel"],
  desert: ["water", "grass", "ground"],
  mountain: ["flying", "fighting", "rock"],
  wetland: ["grass", "electric", "water"],
  coast: ["water", "electric", "flying"],
  forest: ["grass", "bug", "flying"],
};
export function PokePathExpedition({
  locale,
  difficulty,
  generationCap,
  roundCount,
  runSeed,
  onFinish,
}: GameProps) {
  const regions = useMemo(
    () =>
      seededShuffle(
        eligibleRegions(generationCap),
        `${runSeed}:expedition-regions`,
      ),
    [generationCap, runSeed],
  );
  const starterRoster = useMemo(
    () => expeditionStarterRoster(generationCap, runSeed),
    [generationCap, runSeed],
  );
  const [starter, setStarter] = useState<number | null>(null),
    [layer, setLayer] = useState(0),
    [team, setTeam] = useState<number[]>([]);
  const [lead, setLead] = useState<number | null>(null),
    [fieldEnergy, setFieldEnergy] = useState(3),
    [routeAction, setRouteAction] = useState<
      "scout" | "shield" | "forage" | null
    >(null),
    [scouted, setScouted] = useState(false),
    [objectiveProgress, setObjectiveProgress] = useState(0);
  const objective =
    seedHash(`${runSeed}:objective`) % 2 === 0
      ? {
          kind: "coast",
          goal: 2,
          label: { en: "Secure 2 coast routes", de: "2 Küstenrouten sichern" },
        }
      : {
          kind: "hazard",
          goal: 3,
          label: {
            en: "Clear 3 hazard routes",
            de: "3 Gefahrenrouten meistern",
          },
        };
  const maxExpeditionHp = difficulty === "hard" ? 60 : 90;
  const [hp, setHp] = useState(maxExpeditionHp),
    [capsules, setCapsules] = useState(difficulty === "hard" ? 2 : 4);
  const [active, setActive] = useState<string>(),
    [encounter, setEncounter] = useState<number | null>(null),
    [locked, setLocked] = useState<string[]>([]);
  const [score, setScore] = useState(0),
    [history, setHistory] = useState<
      { region: string; sector: string; effect: string }[]
    >([]);
  const region = regions[layer % regions.length] ?? regions[0];
  const choices = useMemo(
    () =>
      seededShuffle(region.nodes, `${runSeed}:route:${layer}`).slice(
        0,
        difficulty === "hard" ? 2 : 3,
      ),
    [difficulty, layer, region.nodes, runSeed],
  );
  const regionTargets = HABITAT_ROUNDS.filter(
    (round) => round.region.id === region.id,
  );
  const teamTypes = new Set(team.flatMap((id) => species(id).types));
  const forecast = (biome: Biome) => {
    const hazard = ["cave", "volcanic", "snow", "desert", "mountain"].includes(
        biome,
      ),
      base = hazard
        ? difficulty === "hard"
          ? 20
          : difficulty === "easy"
            ? 11
            : 15
        : 5;
    const counter = (biomeCounters[biome] ?? []).find((type) =>
      teamTypes.has(type),
    );
    return {
      hazard,
      counter,
      damage: Math.max(1, base - (counter ? (hazard ? 8 : 2) : 0)),
      bonus: ["meadow", "coast", "wetland"].includes(biome),
    };
  };
  const fieldCamp = () => {
    if (capsules <= 0 || hp >= 90 || encounter !== null) return;
    setCapsules((value) => value - 1);
    setHp((value) =>
      Math.min(maxExpeditionHp, value + (difficulty === "hard" ? 10 : 14)),
    );
    setScore((value) => Math.max(0, value - 40));
  };
  const begin = (id: number) => {
    setStarter(id);
    setTeam([id]);
    setLead(id);
    setActive(region.nodes[0]?.id);
  };
  const choose = (node: string) => {
    const picked = region.nodes.find((item) => item.id === node)!;
    const route = forecast(picked.biome);
    const leadType = lead
      ? species(lead).types.find((type) =>
          (biomeCounters[picked.biome] ?? []).includes(type),
        )
      : undefined;
    const damage = Math.max(
      0,
      route.damage - (routeAction === "shield" ? 8 : 0) - (leadType ? 4 : 0),
    );
    const nextHp = Math.max(0, hp - damage);
    setHp(nextHp);
    if (route.bonus) setCapsules((value) => Math.min(6, value + 1));
    const target =
      regionTargets[
        seedHash(`${runSeed}:${layer}:${node}`) %
          Math.max(1, regionTargets.length)
      ];
    const speciesSignal = layer % 4 === 2 ? null : (target?.target.id ?? null);
    setEncounter(speciesSignal ?? -1);
    setActive(node);
    setLocked(
      choices.filter((choice) => choice.id !== node).map((choice) => choice.id),
    );
    const assisted = route.counter
      ? `${locale === "de" ? "Teamvorteil" : "team assist"}: ${route.counter}`
      : "";
    setHistory((items) => [
      ...items,
      {
        region: region.name[locale],
        sector: picked.name[locale],
        effect: `−${damage} HP · ${species(lead ?? team[0]).name[locale]}${leadType ? " blocked 4" : ""}${routeAction === "shield" ? " · Shield blocked 8" : ""}${route.bonus ? " · +1 capsule" : ""}${assisted ? ` · ${assisted}` : ""}`,
      },
    ]);
    setScore(
      (value) =>
        value + Math.max(50, 190 - damage * 4) + (route.hazard ? 80 : 0),
    );
    if (
      (objective.kind === "coast" && picked.biome === "coast") ||
      (objective.kind === "hazard" && route.hazard)
    )
      setObjectiveProgress((value) => Math.min(objective.goal, value + 1));
    setRouteAction(null);
    setScouted(false);
    setFieldEnergy((value) => Math.min(3, value + 1));
    emitGameFeel({
      id: `expedition-route-${layer}-${node}`,
      type: "impact",
      value: -damage,
      focus: ".poke-encounter-card",
    });
  };
  const action = (kind: "scout" | "shield" | "forage") => {
    if (fieldEnergy <= 0 || encounter !== null) return;
    setFieldEnergy((value) => value - 1);
    setRouteAction(kind);
    if (kind === "scout") setScouted(true);
    if (kind === "forage") {
      const capsule = seedHash(`${runSeed}:forage:${layer}`) % 2 === 0;
      if (capsule) setCapsules((value) => Math.min(6, value + 1));
      else setHp((value) => Math.min(maxExpeditionHp, value + 10));
    }
    emitGameFeel({
      id: `expedition-action-${layer}-${kind}`,
      type: kind === "scout" ? "scan" : "select",
      label: kind.toUpperCase(),
      focus: ".poke-route-choice",
    });
  };
  const resolve = (catchIt: boolean, replaceIndex?: number) => {
    let nextTeam = team;
    if (catchIt && encounter && encounter > 0 && capsules > 0) {
      if (team.length >= 6 && replaceIndex === undefined) return;
      nextTeam =
        team.length < 6
          ? [...team, encounter]
          : team.map((id, index) => (index === replaceIndex ? encounter : id));
      setTeam(nextTeam);
      setCapsules((value) => value - 1);
    }
    const next = layer + 1;
    setEncounter(null);
    setLocked([]);
    if (next >= roundCount || hp <= 0) {
      const coverage = new Set(nextTeam.flatMap((id) => species(id).types))
          .size,
        finalScore =
          score +
          Math.round(hp * 5 + coverage * 120 + capsules * 50) +
          (objectiveProgress >= objective.goal ? 500 : 0);
      onFinish(
        finalScore,
        hp > 0 ? next : Math.max(0, next - 1),
        next,
        nextTeam,
        next,
      );
    } else setLayer(next);
  };
  if (!starter)
    return (
      <section className="poke-expedition-brief">
        <div>
          <p className="poke-kicker">STARTER CLEARANCE</p>
          <h2>
            {locale === "de"
              ? "Wähle dein erstes Feldexemplar"
              : "Choose your first field specimen"}
          </h2>
          <p>
            {locale === "de"
              ? "Sein Typ entscheidet, welche späteren Routen riskant oder effizient werden."
              : "Its type changes which later routes are risky or efficient."}
          </p>
        </div>
        <div className="poke-starter-bay">
          {starterRoster.map((entry) => (
            <button key={entry.id} onClick={() => begin(entry.id)}>
              <PokemonSprite entry={entry} />
              <span>
                #{String(entry.id).padStart(3, "0")} · GEN {entry.generation}
              </span>
              <b>{entry.name[locale]}</b>
              <small>{entry.types.join(" · ")}</small>
            </button>
          ))}
        </div>
      </section>
    );
  return (
    <div
      className="poke-expedition"
      style={{ "--region-accent": region.accent } as React.CSSProperties}
    >
      <RunHud
        score={score + hp * 5 + team.length * 100}
        round={layer + 1}
        total={roundCount}
        resource={fieldEnergy}
        label="ENERGY"
      />
      <div className="poke-region-transition">
        <span>EXPEDITION STAGE {layer + 1}</span>
        <b>{region.name[locale]}</b>
        <i />
      </div>
      <div className="poke-expedition-grid">
        <RegionalAtlas region={region} locale={locale} activeSector={active} />
        <aside className="poke-field-console">
          <header>
            <span>TEAM / {team.length}·6</span>
            <strong>HP {hp}</strong>
          </header>
          <div className="poke-team-tray">
            {[0, 1, 2, 3, 4, 5].map((slot) =>
              team[slot] ? (
                <button
                  key={slot}
                  className={lead === team[slot] ? "is-lead" : ""}
                  onClick={() => setLead(team[slot])}
                >
                  <PokemonSprite entry={species(team[slot])} size={72} />
                  <small>
                    {lead === team[slot] ? "LEAD · " : ""}
                    {species(team[slot]).name[locale]}
                  </small>
                </button>
              ) : (
                <div key={slot} className="is-empty">
                  +
                </div>
              ),
            )}
          </div>
          {encounter === null ? (
            <div className="poke-route-choice">
              <div className="poke-expedition-objective">
                <b>OBJECTIVE · {objective.label[locale]}</b>
                <span>
                  {objectiveProgress}/{objective.goal} · +500
                </span>
              </div>
              <p>
                {locale === "de"
                  ? "Dein gesamtes Team verändert Schaden und Ertrag. Risikoreiche Routen geben mehr Punkte."
                  : "Your full team changes damage and yield. Risky routes award more points."}
              </p>
              <button
                className="poke-secondary"
                disabled={capsules <= 0 || hp >= 90}
                onClick={fieldCamp}
              >
                <Shield />
                <span>
                  {locale === "de" ? "Feldlager nutzen" : "Use field camp"}
                  <small>
                    {locale === "de"
                      ? "1 Kapsel · heilt vor der Routenwahl · −40 Punkte"
                      : "1 capsule · heal before routing · −40 score"}
                  </small>
                </span>
              </button>
              <div className="poke-route-actions">
                <button
                  disabled={fieldEnergy <= 0 || routeAction === "scout"}
                  onClick={() => action("scout")}
                >
                  <Crosshair />
                  <span>
                    SCOUT
                    <small>
                      {locale === "de"
                        ? "1 Energie · exakte Werte"
                        : "1 energy · exact values"}
                    </small>
                  </span>
                </button>
                <button
                  disabled={fieldEnergy <= 0 || routeAction === "shield"}
                  onClick={() => action("shield")}
                >
                  <Shield />
                  <span>
                    SHIELD
                    <small>
                      {locale === "de"
                        ? "1 Energie · −8 Schaden"
                        : "1 energy · −8 damage"}
                    </small>
                  </span>
                </button>
                <button
                  disabled={fieldEnergy <= 0 || routeAction === "forage"}
                  onClick={() => action("forage")}
                >
                  <Swords />
                  <span>
                    FORAGE
                    <small>
                      {locale === "de"
                        ? "1 Energie · Kapsel oder +10 HP"
                        : "1 energy · capsule or +10 HP"}
                    </small>
                  </span>
                </button>
              </div>
              {choices.map((node) => {
                const route = forecast(node.biome);
                return (
                  <button
                    key={node.id}
                    disabled={locked.includes(node.id)}
                    onClick={() => choose(node.id)}
                  >
                    <Crosshair />
                    <span>
                      {node.name[locale]}
                      <small>
                        {node.biome} ·{" "}
                        {scouted
                          ? `−${Math.max(0, route.damage - (routeAction === "shield" ? 8 : 0))} HP`
                          : `${route.hazard ? "8–20" : "1–8"} HP`}{" "}
                        ·{" "}
                        {route.counter
                          ? `${locale === "de" ? "Konter" : "counter"} ${route.counter}`
                          : route.hazard
                            ? locale === "de"
                              ? "Risiko"
                              : "risk"
                            : locale === "de"
                              ? "stabil"
                              : "stable"}
                        {route.bonus ? " · +1 capsule" : ""}
                      </small>
                    </span>
                    {locked.includes(node.id) && <LockKeyhole />}
                  </button>
                );
              })}
            </div>
          ) : encounter > 0 ? (
            <div className="poke-encounter-card">
              <p className="poke-kicker">WILD SIGNAL</p>
              <PokemonSprite entry={species(encounter)} size={145} />
              <h3>{species(encounter).name[locale]}</h3>
              <small>
                {species(encounter).types.join(" · ")} ·{" "}
                {locale === "de"
                  ? "kann neue Routen kontern"
                  : "can counter later routes"}
              </small>
              {team.length < 6 ? (
                <div>
                  <button
                    className="poke-primary"
                    disabled={capsules === 0}
                    onClick={() => resolve(true)}
                  >
                    {locale === "de" ? "Fangen" : "Catch"}
                  </button>
                  <button
                    className="poke-secondary"
                    onClick={() => resolve(false)}
                  >
                    {locale === "de"
                      ? "Dokumentieren & weiter"
                      : "Log & continue"}
                  </button>
                </div>
              ) : (
                <>
                  <p>
                    {locale === "de"
                      ? "Team voll: Wähle das zu ersetzende Mitglied oder dokumentiere den Fund."
                      : "Team full: choose the member to replace or log the sighting."}
                  </p>
                  <div className="poke-expedition-replace">
                    {team.map((id, index) => (
                      <button
                        key={`${id}-${index}`}
                        disabled={capsules === 0}
                        onClick={() => resolve(true, index)}
                      >
                        <PokemonSprite entry={species(id)} size={52} />
                        <span>{species(id).name[locale]}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    className="poke-secondary"
                    onClick={() => resolve(false)}
                  >
                    {locale === "de" ? "Nicht fangen" : "Do not catch"}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="poke-encounter-card">
              <p className="poke-kicker">FIELD EVENT</p>
              <div className="poke-expedition-cache">
                <Shield />
                <b>
                  {hp <= 0
                    ? locale === "de"
                      ? "Die Expedition muss hier evakuiert werden."
                      : "The expedition must evacuate here."
                    : locale === "de"
                      ? "Keine Sichtung – aber wertvolle Habitatdaten."
                      : "No sighting—but valuable habitat data."}
                </b>
              </div>
              <button className="poke-primary" onClick={() => resolve(false)}>
                {hp <= 0
                  ? locale === "de"
                    ? "Run abschließen"
                    : "End run"
                  : locale === "de"
                    ? "Pfad fortsetzen"
                    : "Continue path"}{" "}
                →
              </button>
            </div>
          )}
        </aside>
      </div>
      <div className="poke-path-history">
        {history.map((item, index) => (
          <span key={`${item.sector}-${index}`}>
            <b>{index + 1}</b>
            {item.region} · {item.sector}
            <small>{item.effect}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

export function RegionRanger({
  locale,
  difficulty,
  generationCap,
  roundCount,
  runSeed,
  onFinish,
}: GameProps) {
  const rounds = useMemo(
    () => rangerRoundsFor(generationCap, roundCount, runSeed),
    [generationCap, roundCount, runSeed],
  );
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hints, setHints] = useState<string[]>([]);
  const [probes, setProbes] = useState<{ x: number; y: number }[]>([]);
  const [candidate, setCandidate] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [probeRead, setProbeRead] = useState("");
  const [feedback, setFeedback] = useState<{
    good: boolean;
    distance: number;
    point: { x: number; y: number };
    nextScore: number;
    nextCorrect: number;
  } | null>(null);
  const current = rounds[round];
  const radius = difficulty === "easy" ? 14 : difficulty === "medium" ? 10 : 7;
  if (!current) return null;
  const quadrant = `${current.target.y < 50 ? (locale === "de" ? "Nord" : "north") : locale === "de" ? "Süd" : "south"}-${current.target.x < 50 ? (locale === "de" ? "west" : "west") : locale === "de" ? "ost" : "east"}`;
  const centreDistance = Math.hypot(
    current.target.x - 50,
    current.target.y - 50,
  );
  const radial =
    centreDistance < 18
      ? locale === "de"
        ? "Zentrum"
        : "inner core"
      : centreDistance < 35
        ? locale === "de"
          ? "mittlerer Ring"
          : "middle ring"
        : locale === "de"
          ? "Außenring"
          : "outer ring";
  const place = (point: { x: number; y: number }) => {
    if (feedback) return;
    if (probes.length < 2) {
      const distance = Math.hypot(
        point.x - current.target.x,
        point.y - current.target.y,
      );
      const previous = probes.at(-1);
      const warmer = previous
        ? distance <
          Math.hypot(
            previous.x - current.target.x,
            previous.y - current.target.y,
          )
        : null;
      const dx = current.target.x - point.x,
        dy = current.target.y - point.y;
      const direction =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? locale === "de"
              ? "Osten"
              : "east"
            : locale === "de"
              ? "Westen"
              : "west"
          : dy > 0
            ? locale === "de"
              ? "Süden"
              : "south"
            : locale === "de"
              ? "Norden"
              : "north";
      setProbes((items) => [...items, point]);
      setProbeRead(
        `${locale === "de" ? "Signal" : "Signal"} ${distance < 16 ? (locale === "de" ? "nah" : "near") : distance < 32 ? (locale === "de" ? "mittel" : "medium") : locale === "de" ? "fern" : "far"} · ${direction}${warmer === null ? "" : warmer ? ` · ${locale === "de" ? "WÄRMER" : "WARMER"}` : ` · ${locale === "de" ? "KÄLTER" : "COLDER"}`}`,
      );
      emitGameFeel({
        id: `ranger-probe-${round}-${probes.length}`,
        type: "scan",
        label: `PROBE ${probes.length + 1}`,
        focus: ".poke-ranger-read",
      });
      return;
    }
    setCandidate(point);
    emitGameFeel({
      id: `ranger-candidate-${round}-${point.x.toFixed(1)}`,
      type: "select",
      label: locale === "de" ? "LOCK BEREIT" : "LOCK READY",
      focus: ".poke-ranger-lock",
    });
  };
  const lockPoint = () => {
    if (!candidate || feedback) return;
    const point = candidate;
    const distance = Math.hypot(
      point.x - current.target.x,
      point.y - current.target.y,
    );
    const close = distance <= radius * 0.45,
      good = distance <= radius * 1.75;
    const gained =
      Math.max(60, Math.round(900 - distance * 24 - hints.length * 70)) +
      (close ? 180 : 0) +
      streak * 45;
    const nextScore = score + gained;
    const nextCorrect = correctCount + (good ? 1 : 0);
    setScore(nextScore);
    setCorrectCount(nextCorrect);
    setStreak(good ? streak + 1 : 0);
    setFeedback({ good, distance, point, nextScore, nextCorrect });
    emitGameFeel({
      id: `ranger-lock-${round}`,
      type: good ? "success" : "impact",
      value: gained,
      focus: ".poke-feedback",
      particles: close,
    });
  };
  const next = () => {
    if (!feedback) return;
    const nr = round + 1;
    if (nr >= rounds.length)
      onFinish(feedback.nextScore, feedback.nextCorrect, nr, [], nr);
    else {
      setRound(nr);
      setFeedback(null);
      setHints([]);
      setProbes([]);
      setCandidate(null);
      setProbeRead("");
    }
  };
  return (
    <div
      className="poke-ranger"
      style={
        { "--region-accent": current.region.accent } as React.CSSProperties
      }
    >
      <RunHud
        score={score}
        round={round + 1}
        total={rounds.length}
        resource={streak}
        label="COMBO"
      />
      <div className="poke-region-transition" key={current.region.id}>
        <span>REGION TRANSITION · GEN {current.region.generation}</span>
        <b>{current.region.name[locale]}</b>
        <i />
      </div>
      <header className="poke-target-brief">
        <span>TARGET {String(round + 1).padStart(2, "0")}</span>
        <h2>{current.target.name[locale]}</h2>
        <p>
          {locale === "de"
            ? "Die zwei Sonden sind kostenlos und liefern Distanz plus Richtung. Analysescans sind optionale Wissenshilfen für je −100 Punkte."
            : "The two probes are free and return distance plus direction. Analysis scans are optional knowledge aids costing −100 each."}
        </p>
        <div
          className="poke-survey-steps"
          aria-label={
            locale === "de" ? "Ablauf der Vermessung" : "Survey sequence"
          }
        >
          <span className={probes.length < 2 ? "is-current" : "is-done"}>
            <b>1</b>
            {locale === "de"
              ? `KOSTENLOSE SONDEN ${probes.length}/2`
              : `FREE PROBES ${probes.length}/2`}
            <small>{locale === "de" ? "Distanz + Richtung" : "Distance + direction"}</small>
          </span>
          <span>
            <b>2</b>
            {locale === "de" ? "OPTIONALE ANALYSE" : "OPTIONAL ANALYSIS"}
            <small>−100 {locale === "de" ? "je Scan" : "each scan"}</small>
          </span>
          <span className={probes.length >= 2 ? "is-current" : ""}>
            <b>3</b>FINAL LOCK
            <small>{locale === "de" ? "Genauigkeit zählt" : "Accuracy scores"}</small>
          </span>
        </div>
        <div className="poke-ranger-hints">
          <button
            disabled={hints.includes("biome") || !!feedback}
            onClick={() => setHints((items) => [...items, "biome"])}
          >
            {hints.includes("biome")
              ? `Terrain: ${current.target.biome}`
              : locale === "de"
                ? "Terrain-Scan −100"
                : "Terrain scan −100"}
          </button>
          <button
            disabled={hints.includes("quadrant") || !!feedback}
            onClick={() => setHints((items) => [...items, "quadrant"])}
          >
            {hints.includes("quadrant")
              ? `${locale === "de" ? "Archivsektor" : "Archive sector"}: ${quadrant}`
              : locale === "de"
                ? "Archiv-Scan −100"
                : "Archive scan −100"}
          </button>
          <button
            disabled={hints.includes("radial") || !!feedback}
            onClick={() => setHints((items) => [...items, "radial"])}
          >
            {hints.includes("radial")
              ? `${locale === "de" ? "Wetterdrift" : "Weather drift"}: ${radial}`
              : locale === "de"
                ? "Wetter-Scan −100"
                : "Weather scan −100"}
          </button>
        </div>
      </header>
      <RegionalAtlas
        region={current.region}
        locale={locale}
        showLabels={false}
        fog={!feedback}
        showRings={!!feedback}
        concealBiomes={!feedback}
        onPlace={place}
        placement={feedback?.point ?? candidate ?? undefined}
        probes={probes}
        activeSector={feedback ? current.target.id : undefined}
      />
      {!feedback && (
        <div className="poke-ranger-read" role="status">
          <b>
            {probes.length < 2
              ? `${locale === "de" ? "SONDE" : "PROBE"} ${probes.length + 1}/2`
              : locale === "de"
                ? "FINALEN PUNKT SETZEN"
                : "PLACE FINAL POINT"}
          </b>
          <span>
            {probeRead ||
              (difficulty === "easy"
                ? locale === "de"
                  ? `Anker: ${current.region.nodes[0]?.name.de} · ${current.region.nodes[1]?.name.de}`
                  : `Anchors: ${current.region.nodes[0]?.name.en} · ${current.region.nodes[1]?.name.en}`
                : locale === "de"
                  ? "Zwei kostenlose Sonden triangulieren das Ziel."
                  : "Two free probes triangulate the target.")}
          </span>
          {probes.length >= 2 && (
            <button
              className="poke-ranger-lock poke-primary"
              disabled={!candidate}
              onClick={lockPoint}
            >
              <LockKeyhole />
              {locale === "de" ? "KOORDINATEN VERRIEGELN" : "LOCK COORDINATES"}
            </button>
          )}
        </div>
      )}
      {feedback && (
        <Feedback good={feedback.good}>
          {feedback.good ? <Check /> : <Crosshair />}
          <span>
            <b>
              {feedback.good
                ? feedback.distance <= radius * 0.45
                  ? locale === "de"
                    ? "Präzisions-Lock"
                    : "Precision lock"
                  : locale === "de"
                    ? "Signal erfasst"
                    : "Signal acquired"
                : locale === "de"
                  ? "Außerhalb des Fangradius"
                  : "Outside capture radius"}
            </b>
            <small>
              {feedback.distance.toFixed(1)} atlas units · radius {radius} ·{" "}
              {hints.length} assists · {current.region.name[locale]}
            </small>
          </span>
          <button onClick={next}>
            {locale === "de" ? "Nächste Region" : "Next region"} →
          </button>
        </Feedback>
      )}
    </div>
  );
}

export function HabitatHunt({
  locale,
  difficulty,
  generationCap,
  roundCount,
  runSeed,
  onFinish,
}: GameProps) {
  const rounds = useMemo(
    () => habitatRoundsFor(generationCap, roundCount, runSeed),
    [generationCap, roundCount, runSeed],
  );
  const [index, setIndex] = useState(0);
  const [probes, setProbes] = useState(
    difficulty === "hard" ? 2 : difficulty === "easy" ? 4 : 3,
  );
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [scanned, setScanned] = useState<string[]>([]);
  const [channels, setChannels] = useState<("terrain" | "weather" | "time")[]>(
    [],
  );
  const [bait, setBait] = useState(false);
  const [feedback, setFeedback] = useState<{
    good: boolean;
    sector: string;
    nextScore: number;
    nextCorrect: number;
  } | null>(null);
  const completedIds = rounds
    .slice(0, index + 1)
    .map((round) => round.target.id);
  const current = rounds[index];
  if (!current)
    return <Feedback good={false}>No habitat fixtures available.</Feedback>;
  const profiles = habitatSectorProfiles(current, `${runSeed}:${index}`),
    lastScanned = scanned.at(-1);
  const profileMatchCount = (profile: (typeof profiles)[number]) =>
    Number(profile.biome === current.clues.biome) +
    Number(profile.weather.en === current.clues.weather.en) +
    Number(profile.time.en === current.clues.time.en);
  const scan = (sector: string) => {
    if (feedback) return;
    setScanned([sector]);
    emitGameFeel({
      id: `hunt-sector-${index}-${sector}`,
      type: "select",
      label: sector,
      focus: ".poke-habitat-scans",
    });
  };
  const lock = (sector: string) => {
    if (feedback) return;
    const good = current.validSectorIds.includes(sector),
      baitWins =
        !bait || seedHash(`${runSeed}:bait:${index}:${sector}`) % 100 < 64,
      multiplier = 1 + (3 - channels.length) * 0.35,
      gained = good
        ? Math.round(
            (520 + probes * 40) * multiplier * (bait && baitWins ? 2 : 1),
          )
        : bait && !baitWins
          ? -90
          : 0,
      nextScore = score + gained,
      nextCorrect = correct + (good ? 1 : 0);
    setScore(nextScore);
    setCorrect(nextCorrect);
    setFeedback({ good, sector, nextScore, nextCorrect });
    emitGameFeel({
      id: `hunt-lock-${index}`,
      type: good ? "success" : "error",
      value: gained,
      focus: ".poke-feedback",
      particles: good,
    });
  };
  const next = () => {
    if (!feedback) return;
    if (index + 1 >= rounds.length) {
      onFinish(
        feedback.nextScore,
        feedback.nextCorrect,
        index + 1,
        completedIds,
        index + 1,
      );
      return;
    }
    setIndex((value) => value + 1);
    setFeedback(null);
    setScanned([]);
    setProbes(difficulty === "hard" ? 2 : difficulty === "easy" ? 4 : 3);
    setChannels([]);
    setBait(false);
  };
  const node = current.region.nodes.find(
    (item) => item.id === feedback?.sector,
  );
  return (
    <div
      className="poke-hunt"
      style={
        { "--region-accent": current.region.accent } as React.CSSProperties
      }
    >
      <RunHud
        score={score}
        round={index + 1}
        total={rounds.length}
        resource={probes}
        label={locale === "de" ? "SCANS" : "SCANS"}
      />
      <div className="poke-region-transition">
        <span>
          REGION {current.region.generation}/{generationCap}
        </span>
        <b>{current.region.name[locale]}</b>
        <i />
      </div>
      <div className="poke-hunt-layout">
        <section className="poke-target-specimen" key={current.key}>
          <span>
            {locale === "de"
              ? "ÖKOLOGISCHE ZIELSIGNATUR"
              : "ECOLOGICAL TARGET SIGNATURE"}{" "}
            · #{current.target.id}
          </span>
          <PokemonSprite entry={current.target} size={190} />
          <h2>{current.target.name[locale]}</h2>
          <div className="poke-ecology-tokens">
            <span>
              BIOME <b>{current.clues.biome}</b>
            </span>
            <span>
              WEATHER <b>{current.clues.weather[locale]}</b>
            </span>
            <span>
              TIME <b>{current.clues.time[locale]}</b>
            </span>
          </div>
          <p>
            {locale === "de"
              ? "Tippe Sektoren an, um ihre Mikroklima-Signatur zu scannen. Lege danach einen gescannten Sektor fest. Das Modell trainiert ökologische Kombinationen, keine exakten Encounter-Koordinaten."
              : "Tap sectors to scan their microclimate signature, then lock one scanned sector. This model teaches ecological combinations, not exact encounter coordinates."}
          </p>
        </section>
        <div>
          <div className="poke-scan-channels">
            <b>
              {locale === "de"
                ? "SCAN-KANÄLE · WENIGER = MEHR PUNKTE"
                : "SCAN CHANNELS · FEWER = HIGHER MULTIPLIER"}
            </b>
            {(["terrain", "weather", "time"] as const).map((channel) => (
              <button
                key={channel}
                disabled={channels.includes(channel) || !!feedback}
                onClick={() => {
                  setChannels((items) => [...items, channel]);
                  setProbes((value) => Math.max(0, value - 1));
                  emitGameFeel({
                    id: `hunt-channel-${index}-${channel}`,
                    type: "reveal",
                    label: channel.toUpperCase(),
                    focus: ".poke-habitat-scans",
                  });
                }}
              >
                {channels.includes(channel) ? "✓ " : ""}
                {channel.toUpperCase()}
              </button>
            ))}
            <button
              className="is-bait"
              aria-pressed={bait}
              disabled={!!feedback}
              onClick={() => setBait((value) => !value)}
            >
              BAIT · 2× {locale === "de" ? "ODER −90" : "OR −90"}
            </button>
          </div>
          <RegionalAtlas
            region={current.region}
            locale={locale}
            showLabels={false}
            onSector={scan}
            activeSector={feedback?.sector ?? lastScanned}
          />
          <div className="poke-habitat-scans">
            {profiles.map((profile, profileIndex) => {
              const visible = true;
              return (
                <article
                  key={profile.node.id}
                  className={
                    feedback?.sector === profile.node.id ? "is-active" : ""
                  }
                >
                  <span>SECTOR {String.fromCharCode(65 + profileIndex)}</span>
                  {visible ? (
                    <>
                      <b>
                        {channels.includes("terrain") || feedback
                          ? profile.biome
                          : "TERRAIN —"}{" "}
                        ·{" "}
                        {channels.includes("weather") || feedback
                          ? profile.weather[locale]
                          : "WEATHER —"}{" "}
                        ·{" "}
                        {channels.includes("time") || feedback
                          ? profile.time[locale]
                          : "TIME —"}
                      </b>
                      <small>
                        {feedback
                          ? `${profileMatchCount(profile)}/3 ${locale === "de" ? "Merkmale passend" : "traits matching"}`
                          : `${Math.round((1 + (3 - channels.length) * 0.35) * 100)}% SCORE`}
                      </small>
                      <button
                        onClick={() => lock(profile.node.id)}
                        disabled={!!feedback}
                      >
                        {locale === "de" ? "SEKTOR FESTLEGEN" : "LOCK SECTOR"}
                      </button>
                    </>
                  ) : (
                    <small>
                      {locale === "de" ? "Noch nicht gescannt" : "Not scanned"}
                    </small>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>
      {feedback && (
        <Feedback good={feedback.good}>
          <span>
            <b>
              {feedback.good
                ? locale === "de"
                  ? "Ökologische Signatur bestätigt"
                  : "Ecological signature confirmed"
                : locale === "de"
                  ? "Mindestens ein Umweltmerkmal widerspricht dem Ziel"
                  : "At least one environmental trait conflicts with the target"}
            </b>
            <small>
              {node?.name[locale]} ·{" "}
              {profiles.find((item) => item.node.id === feedback.sector)?.biome}{" "}
              · {current.region.name[locale]}
            </small>
          </span>
          <button onClick={next}>
            {index + 1 >= rounds.length
              ? locale === "de"
                ? "Feldstudie abschließen"
                : "Complete field study"
              : locale === "de"
                ? "Nächste Region"
                : "Next region"}{" "}
            →
          </button>
        </Feedback>
      )}
    </div>
  );
}
