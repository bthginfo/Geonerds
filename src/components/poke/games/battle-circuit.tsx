"use client";

import { useMemo, useState } from "react";
import {
  BatteryCharging,
  RotateCcw,
  Shield,
  ShieldPlus,
  Sparkles,
  Swords,
  UsersRound,
} from "lucide-react";
import { PokemonSprite } from "../pokemon-sprite";
import { RunHud } from "../gameplay";
import {
  CIRCUIT_MOVES,
  battleWinReward,
  circuitDamage,
  circuitHp,
  circuitMovesFor,
  circuitPartners,
  generateBattleCircuit,
  recoveryCounterOutcome,
  type CircuitMove,
} from "@/poke/battle";
import { TYPE_COLORS, localizedType } from "@/poke/type-chart";
import { seededShuffle } from "@/poke/variety";
import type { GameProps } from "../gameplay";
import type { Species } from "@/poke/types";
import { emitGameFeel } from "../game-feel";

type Log = { tone: "player" | "rival" | "system"; text: string };
type PitChoice = "switch" | "move" | "recover";

export function BattleCircuit({
  locale,
  difficulty,
  generationCap,
  roundCount,
  runSeed,
  onFinish,
}: GameProps) {
  const partners = useMemo(
    () => circuitPartners(generationCap, runSeed),
    [generationCap, runSeed],
  );
  const [partner, setPartner] = useState<Species | null>(null);
  const opponents = useMemo(
    () =>
      generateBattleCircuit(
        generationCap,
        roundCount,
        partner?.id,
        runSeed,
        difficulty,
      ),
    [difficulty, generationCap, partner?.id, roundCount, runSeed],
  );
  const [match, setMatch] = useState(0);
  const rival = opponents[match];
  const [playerHp, setPlayerHp] = useState(0);
  const [rivalHp, setRivalHp] = useState(0);
  const [energy, setEnergy] = useState(3);
  const [momentum, setMomentum] = useState(0);
  const [recoveries, setRecoveries] = useState(
    difficulty === "easy" ? 3 : difficulty === "hard" ? 1 : 2,
  );
  const [moves, setMoves] = useState<CircuitMove[]>([]);
  const [log, setLog] = useState<Log[]>([]);
  const [score, setScore] = useState(0);
  const [resolvedScore, setResolvedScore] = useState<number | null>(null);
  const [turn, setTurn] = useState(1);
  const [between, setBetween] = useState(false);
  const [pit, setPit] = useState(false);
  const [encountered, setEncountered] = useState<number[]>([]);

  const start = (entry: Species) => {
    const first = generateBattleCircuit(
      generationCap,
      roundCount,
      entry.id,
      runSeed,
      difficulty,
    )[0];
    setPartner(entry);
    setPlayerHp(circuitHp(entry));
    setRivalHp(circuitHp(first));
    setMoves(circuitMovesFor(entry));
    setLog([
      {
        tone: "system",
        text:
          locale === "de"
            ? `${entry.name.de} betritt den Circuit.`
            : `${entry.name.en} enters the circuit.`,
      },
    ]);
  };
  if (!partner || !rival)
    return (
      <PartnerSelect partners={partners} locale={locale} onSelect={start} />
    );
  const intentKind = (["attack", "guard", "charge"] as const)[
    (turn + rival.id + match) % 3
  ];

  const respond = (
    nextRivalHp: number,
    nextEnergy: number,
    wasGuarding: boolean,
    basePlayerHp = playerHp,
  ) => {
    if (nextRivalHp <= 0) {
      const cleared = match + 1;
      const gained = battleWinReward(basePlayerHp, turn),
        nextScore = score + gained;
      setScore(nextScore);
      setResolvedScore(nextScore);
      setBetween(true);
      setEncountered((ids) => [...ids, rival.id]);
      setLog((items) =>
        (
          [
            {
              tone: "system",
              text:
                locale === "de"
                  ? `${rival.name.de} ist kampfunfähig. +${gained}`
                  : `${rival.name.en} fainted. +${gained}`,
            },
            ...items,
          ] as Log[]
        ).slice(0, 4),
      );
      if (cleared < roundCount && cleared % 5 === 0) setPit(true);
      return;
    }
    const rivalMoves = circuitMovesFor(rival);
    const choice = rivalMoves[(turn + rival.id) % rivalMoves.length];
    const raw =
      intentKind === "attack"
        ? circuitDamage(choice, rival, partner, wasGuarding)
        : 0;
    const nextPlayer = recoveryCounterOutcome(
      basePlayerHp,
      circuitHp(partner),
      0,
      raw,
    ).remainingHp;
    setPlayerHp(nextPlayer);
    setEnergy(Math.min(5, nextEnergy + (intentKind === "charge" ? 2 : 1)));
    setTurn((value) => value + 1);
    setLog((items) =>
      (
        [
          {
            tone: "rival",
            text: `${rival.name[locale]} · ${choice.name[locale]} · −${raw} HP`,
          },
          ...items,
        ] as Log[]
      ).slice(0, 4),
    );
    if (nextPlayer <= 0)
      onFinish(score, match, match + 1, [partner.id, ...encountered, rival.id]);
  };
  const attack = (move: CircuitMove) => {
    if (between || pit || energy < move.energy) return;
    const damage = circuitDamage(move, partner, rival, intentKind === "guard");
    const countered =
      (intentKind === "guard" && move.role === "break") ||
      (intentKind === "charge" && move.role === "charge") ||
      moveRead(move).label === (locale === "de" ? "sehr effektiv" : "strong");
    if (countered) {
      setMomentum((value) => Math.min(3, value + 1));
      emitGameFeel({
        id: `circuit-counter-${match}-${turn}`,
        type: "combo",
        label: locale === "de" ? "GEKONTERT" : "COUNTERED",
        focus: ".poke-circuit-actions",
      });
    }
    const next = Math.max(0, rivalHp - damage);
    setRivalHp(next);
    setLog((items) =>
      (
        [
          {
            tone: "player",
            text: `${partner.name[locale]} · ${move.name[locale]} · −${damage} HP`,
          },
          ...items,
        ] as Log[]
      ).slice(0, 4),
    );
    respond(next, energy - move.energy, false);
  };
  const guard = () => {
    if (between || pit) return;
    if (intentKind === "attack") {
      setMomentum((value) => Math.min(3, value + 1));
      emitGameFeel({
        id: `circuit-guard-${match}-${turn}`,
        type: "combo",
        label: locale === "de" ? "ABSICHT GELESEN" : "INTENT READ",
      });
    }
    setLog((items) =>
      (
        [
          {
            tone: "player",
            text:
              locale === "de"
                ? "Schutzstellung: halber Gegenschaden."
                : "Guard stance: half counter damage.",
          },
          ...items,
        ] as Log[]
      ).slice(0, 4),
    );
    respond(rivalHp, Math.min(4, energy + 1), true);
  };
  const overdrive = () => {
    if (momentum < 3 || between || pit) return;
    const damage = Math.max(55, Math.round(circuitHp(rival) * 0.34));
    const next = Math.max(0, rivalHp - damage);
    setRivalHp(next);
    setMomentum(0);
    emitGameFeel({
      id: `overdrive-${match}-${turn}`,
      type: "success",
      label: "OVERDRIVE",
      value: damage,
      particles: true,
    });
    setLog((items) =>
      (
        [
          {
            tone: "player",
            text: `OVERDRIVE · −${damage} HP`,
          },
          ...items,
        ] as Log[]
      ).slice(0, 4),
    );
    respond(next, energy, false);
  };
  const recover = () => {
    if (between || pit || recoveries <= 0) return;
    const restored = Math.round(circuitHp(partner) * 0.28),
      healedHp = recoveryCounterOutcome(
        playerHp,
        circuitHp(partner),
        restored,
        0,
      ).healedHp;
    setPlayerHp(healedHp);
    setRecoveries((value) => value - 1);
    setLog((items) =>
      (
        [
          {
            tone: "player",
            text:
              locale === "de"
                ? `Feldkit: +${restored} HP.`
                : `Field kit: +${restored} HP.`,
          },
          ...items,
        ] as Log[]
      ).slice(0, 4),
    );
    respond(rivalHp, energy, false, healedHp);
  };
  const advance = () => {
    const completed = match + 1;
    if (completed >= roundCount) {
      onFinish(resolvedScore ?? score, completed, completed, [
        partner.id,
        ...encountered,
      ]);
      return;
    }
    setMatch(completed);
    setRivalHp(circuitHp(opponents[completed]));
    setBetween(false);
    setResolvedScore(null);
    setTurn(1);
    setLog([
      {
        tone: "system",
        text:
          locale === "de"
            ? `Match ${completed + 1}: neuer Gegner erfasst.`
            : `Match ${completed + 1}: new rival scanned.`,
      },
    ]);
  };
  const pitAction = (choice: PitChoice, payload?: number | string) => {
    if (choice === "switch") {
      const replacement =
        partners.find((entry) => entry.id === payload) ??
        partners.find((entry) => entry.id !== partner.id);
      if (replacement) {
        setPartner(replacement);
        setPlayerHp(circuitHp(replacement));
        setMoves(circuitMovesFor(replacement));
      }
    } else if (choice === "move") {
      const learned =
        CIRCUIT_MOVES.find((move) => move.id === payload) ??
        CIRCUIT_MOVES.find(
          (move) => !moves.some((owned) => owned.id === move.id),
        );
      if (learned) setMoves((owned) => [...owned.slice(0, 3), learned]);
    } else {
      setPlayerHp(circuitHp(partner));
      setRecoveries((value) => value + 1);
    }
    setPit(false);
    advance();
  };

  const completed = match + (between ? 1 : 0);
  const intentMoves = circuitMovesFor(rival),
    intent = intentMoves[(turn + rival.id) % intentMoves.length],
    intentDamage =
      intentKind === "attack" ? circuitDamage(intent, rival, partner) : 0;
  const moveRead = (move: CircuitMove) => {
    const projected = circuitDamage(move, partner, rival);
    const neutral = Math.max(
      1,
      Math.round(
        (move.power / 4) * (partner.types.includes(move.type) ? 1.5 : 1),
      ),
    );
    const ratio = projected / neutral;
    return {
      projected,
      label:
        ratio > 1.15
          ? locale === "de"
            ? "sehr effektiv"
            : "strong"
          : ratio < 0.85
            ? locale === "de"
              ? "resistiert"
              : "resisted"
            : locale === "de"
              ? "neutral"
              : "neutral",
    };
  };
  const switchOptions = seededShuffle(
    partners.filter((entry) => entry.id !== partner.id),
    `${runSeed}:pit:${match}:partners`,
  ).slice(0, 3);
  const moveOptions = seededShuffle(
    CIRCUIT_MOVES.filter(
      (move) => !moves.some((owned) => owned.id === move.id),
    ),
    `${runSeed}:pit:${match}:moves`,
  ).slice(0, 3);
  return (
    <div className="poke-circuit">
      <RunHud
        score={score}
        round={Math.min(match + 1, roundCount)}
        total={roundCount}
        resource={energy}
        label="ENERGY"
      />
      <div className="poke-tactic-strip">
        <b>{locale === "de" ? "KONTERDREIECK" : "COUNTER TRIANGLE"}</b>
        <span>Attack → Guard</span>
        <span>Guard → Break</span>
        <span>Charge → Charge</span>
        <strong>MOMENTUM {momentum}/3</strong>
      </div>
      <div
        className="poke-checkpoint-rail"
        aria-label={
          locale === "de" ? "Circuit-Fortschritt" : "Circuit progress"
        }
      >
        {Array.from({ length: roundCount }, (_, index) => (
          <i
            key={index}
            className={
              index < completed
                ? "is-cleared"
                : index === match
                  ? "is-live"
                  : index > 0 && index % 5 === 0
                    ? "is-pit"
                    : ""
            }
          >
            <span>{index + 1}</span>
          </i>
        ))}
      </div>
      <section className="poke-circuit-stage">
        <Combatant
          entry={partner}
          locale={locale}
          hp={playerHp}
          max={circuitHp(partner)}
          label={locale === "de" ? "DEIN PARTNER" : "YOUR PARTNER"}
        />
        <div className="poke-circuit-core">
          <Swords />
          <b>TURN {turn}</b>
          <small>
            {locale === "de"
              ? "Eigenes Forschungs-Regelset"
              : "Original research ruleset"}
          </small>
          <div className={`poke-enemy-intent is-${intentKind}`}>
            <span>{locale === "de" ? "GEGNERABSICHT" : "ENEMY INTENT"}</span>
            <b>
              {intentKind.toUpperCase()} ·{" "}
              {intentKind === "attack"
                ? intent.name[locale]
                : intentKind === "guard"
                  ? "BRACE"
                  : "POWER UP"}
            </b>
            <small>
              {localizedType(intent.type, locale)} · {intentDamage}{" "}
              {locale === "de" ? "Schaden" : "damage"} ·{" "}
              {locale === "de" ? "Schutz reduziert auf" : "guard reduces to"}{" "}
              {circuitDamage(intent, rival, partner, true)}
            </small>
          </div>
        </div>
        <Combatant
          entry={rival}
          locale={locale}
          hp={rivalHp}
          max={circuitHp(rival)}
          label={`${locale === "de" ? "MATCH" : "MATCH"} ${match + 1}`}
        />
      </section>
      <div className="poke-circuit-console">
        <div className="poke-circuit-moves">
          {moves.map((move) => {
            const read = moveRead(move);
            return (
              <button
                type="button"
                key={move.id}
                disabled={between || pit || energy < move.energy}
                onClick={() => attack(move)}
                style={
                  {
                    "--type-color": TYPE_COLORS[move.type],
                  } as React.CSSProperties
                }
              >
                <span>
                  <b>{move.name[locale]}</b>
                  <small>
                    {move.role.toUpperCase()} · {localizedType(move.type, locale)} · {move.power} PWR ·{" "}
                    {difficulty === "hard"
                      ? read.label
                      : `${read.projected} DMG · ${read.label}`}
                  </small>
                </span>
                <strong>
                  {move.energy}
                  <BatteryCharging />
                </strong>
              </button>
            );
          })}
        </div>
        <aside className="poke-battle-log">
          {log.map((item, index) => (
            <p className={`is-${item.tone}`} key={`${item.text}-${index}`}>
              {item.text}
            </p>
          ))}
        </aside>
      </div>
      <div className="poke-circuit-actions">
        <button onClick={guard} disabled={between || pit}>
          <Shield /> {locale === "de" ? "Schützen + Energie" : "Guard + energy"}
        </button>
        <button
          className="poke-overdrive"
          onClick={overdrive}
          disabled={between || pit || momentum < 3}
        >
          <Sparkles /> OVERDRIVE {momentum}/3
        </button>
        <button onClick={recover} disabled={between || pit || recoveries <= 0}>
          <ShieldPlus /> {locale === "de" ? "Feldkit" : "Field kit"} (
          {recoveries})
        </button>
        {between && !pit && (
          <button className="poke-primary" onClick={advance}>
            {match + 1 >= roundCount
              ? locale === "de"
                ? "Circuit beenden"
                : "Finish circuit"
              : locale === "de"
                ? "Nächstes Match"
                : "Next match"}{" "}
            →
          </button>
        )}
      </div>
      <p className="poke-ruleset">
        {locale === "de"
          ? "Typenwirkung und STAB folgen dem modernen Typensystem. Attackenwerte sind geprüft; die Partner-Kompatibilität ist ein bewusst eigenes Lern-Regelset und keine kanonische Learnset-Aussage."
          : "Type effectiveness and STAB follow the modern type chart. Move values are checked; partner compatibility is an original learning ruleset, not a claim about canonical learnsets."}
      </p>
      {pit && (
        <PitStop
          locale={locale}
          partner={partner}
          switchOptions={switchOptions}
          moveOptions={moveOptions}
          onChoose={pitAction}
        />
      )}
    </div>
  );
}

function PartnerSelect({
  partners,
  locale,
  onSelect,
}: {
  partners: Species[];
  locale: "de" | "en";
  onSelect: (entry: Species) => void;
}) {
  return (
    <div className="poke-partner-select">
      <header>
        <p className="poke-kicker">BATTLE CIRCUIT / PARTNER BAY</p>
        <h2>
          {locale === "de"
            ? "Wähle deinen Circuit-Partner"
            : "Choose your circuit partner"}
        </h2>
        <p>
          {locale === "de"
            ? "HP, Energie und Ressourcen bleiben über alle Matches bestehen. Alle fünf Siege wartet ein Pit Stop."
            : "HP, energy and resources persist across matches. A pit stop waits after every five wins."}
        </p>
      </header>
      <div>
        {partners.map((entry) => (
          <button type="button" onClick={() => onSelect(entry)} key={entry.id}>
            <PokemonSprite entry={entry} size={112} />
            <span>
              #{entry.id} · GEN {entry.generation}
            </span>
            <b>{entry.name[locale]}</b>
            <small>
              {entry.types
                .map((type) => localizedType(type, locale))
                .join(" / ")}
            </small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Combatant({
  entry,
  locale,
  hp,
  max,
  label,
}: {
  entry: Species;
  locale: "de" | "en";
  hp: number;
  max: number;
  label: string;
}) {
  return (
    <div className="poke-circuit-combatant">
      <span>{label}</span>
      <PokemonSprite entry={entry} size={175} />
      <h3>{entry.name[locale]}</h3>
      <div className="poke-hp-track">
        <i style={{ width: `${Math.max(0, (hp / max) * 100)}%` }} />
      </div>
      <b>
        {hp} / {max} HP
      </b>
    </div>
  );
}

function PitStop({
  locale,
  partner,
  switchOptions,
  moveOptions,
  onChoose,
}: {
  locale: "de" | "en";
  partner: Species;
  switchOptions: Species[];
  moveOptions: CircuitMove[];
  onChoose: (choice: PitChoice, payload?: number | string) => void;
}) {
  const [mode, setMode] = useState<"menu" | "switch" | "move">("menu");
  return (
    <div
      className="poke-pit-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Pit stop"
    >
      <section>
        <Sparkles />
        <p className="poke-kicker">CHECKPOINT 05 / PIT STOP</p>
        <h2>
          {locale === "de"
            ? "Eine strategische Entscheidung"
            : "One strategic decision"}
        </h2>
        <p>
          {locale === "de"
            ? `${partner.name.de} hat den Kontrollpunkt erreicht. Du entscheidest, welches konkrete Upgrade der Run erhält.`
            : `${partner.name.en} reached the checkpoint. You choose the exact upgrade for this run.`}
        </p>
        {mode === "menu" ? (
          <div>
            <button onClick={() => setMode("switch")}>
              <UsersRound />
              <b>{locale === "de" ? "Partner wählen" : "Choose partner"}</b>
              <small>
                {locale === "de"
                  ? "Drei Kandidaten mit voller HP vergleichen"
                  : "Compare three full-HP candidates"}
              </small>
            </button>
            <button onClick={() => setMode("move")}>
              <RotateCcw />
              <b>{locale === "de" ? "Attacke wählen" : "Choose a move"}</b>
              <small>
                {locale === "de"
                  ? "Ersetzt den vierten Slot"
                  : "Replaces slot four"}
              </small>
            </button>
            <button onClick={() => onChoose("recover")}>
              <ShieldPlus />
              <b>{locale === "de" ? "Vollwartung" : "Full service"}</b>
              <small>
                {locale === "de"
                  ? "Volle HP + ein Feldkit"
                  : "Full HP + one field kit"}
              </small>
            </button>
          </div>
        ) : mode === "switch" ? (
          <div className="poke-pit-options">
            {switchOptions.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onChoose("switch", entry.id)}
              >
                <PokemonSprite entry={entry} size={72} />
                <b>{entry.name[locale]}</b>
                <small>
                  {entry.types
                    .map((type) => localizedType(type, locale))
                    .join(" / ")}{" "}
                  · {circuitHp(entry)} HP
                </small>
              </button>
            ))}
            <button onClick={() => setMode("menu")}>
              {locale === "de" ? "Zurück" : "Back"}
            </button>
          </div>
        ) : (
          <div className="poke-pit-options">
            {moveOptions.map((move) => (
              <button
                key={move.id}
                onClick={() => onChoose("move", move.id)}
                style={
                  {
                    "--type-color": TYPE_COLORS[move.type],
                  } as React.CSSProperties
                }
              >
                <b>{move.name[locale]}</b>
                <small>
                  {move.role.toUpperCase()} · {localizedType(move.type, locale)} · {move.power} PWR
                </small>
              </button>
            ))}
            <button onClick={() => setMode("menu")}>
              {locale === "de" ? "Zurück" : "Back"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
