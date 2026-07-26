import fs from "node:fs/promises";

const api = "https://pokeapi.co/api/v2";
const ids = Array.from({ length: 1025 }, (_, index) => index + 1);
const generationNumbers = {
  "generation-i": 1,
  "generation-ii": 2,
  "generation-iii": 3,
  "generation-iv": 4,
  "generation-v": 5,
  "generation-vi": 6,
  "generation-vii": 7,
  "generation-viii": 8,
  "generation-ix": 9,
};
const batches = [];
for (let index = 0; index < ids.length; index += 20) batches.push(ids.slice(index, index + 20));

const species = [];
for (const batch of batches) {
  const rows = await Promise.all(batch.map(async (id) => {
    const [pokemon, detail] = await Promise.all([
      fetch(`${api}/pokemon/${id}`).then((response) => response.json()),
      fetch(`${api}/pokemon-species/${id}`).then((response) => response.json()),
    ]);
    const localized = Object.fromEntries(detail.names.map((item) => [item.language.name, item.name]));
    const stats = Object.fromEntries(pokemon.stats.map((item) => [item.stat.name, item.base_stat]));
    return {
      id,
      name: { en: localized.en ?? detail.name, de: localized.de ?? localized.en ?? detail.name },
      sprite: pokemon.sprites.other?.["official-artwork"]?.front_default ?? pokemon.sprites.front_default,
      fallbackSprite: pokemon.sprites.front_default,
      cry: pokemon.cries?.latest ?? null,
      legacyCry: pokemon.cries?.legacy ?? null,
      types: pokemon.types.sort((a, b) => a.slot - b.slot).map((item) => item.type.name),
      stats: {
        hp: stats.hp,
        attack: stats.attack,
        defense: stats.defense,
        specialAttack: stats["special-attack"],
        specialDefense: stats["special-defense"],
        speed: stats.speed,
      },
      abilities: pokemon.abilities.map((item) => item.ability.name),
      generation: generationNumbers[detail.generation.name],
      habitat: detail.habitat?.name ?? "unknown",
      color: detail.color.name,
      shape: detail.shape?.name ?? "unknown",
      legendary: detail.is_legendary,
      mythical: detail.is_mythical,
      evolvesFrom: detail.evolves_from_species ? Number(detail.evolves_from_species.url.match(/\/(\d+)\/$/)?.[1]) : null,
      heightM: pokemon.height / 10,
      weightKg: pokemon.weight / 10,
    };
  }));
  species.push(...rows);
}

const types = {};
for (const id of [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
  "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
]) {
  const detail = await fetch(`${api}/type/${id}`).then((response) => response.json());
  types[id] = {
    double: detail.damage_relations.double_damage_to.map((item) => item.name),
    half: detail.damage_relations.half_damage_to.map((item) => item.name),
    none: detail.damage_relations.no_damage_to.map((item) => item.name),
  };
}

await fs.mkdir("src/poke/data", { recursive: true });
await fs.writeFile("src/poke/data/species.json", JSON.stringify(species, null, 2) + "\n");
await fs.writeFile("src/poke/data/type-chart.json", JSON.stringify(types, null, 2) + "\n");
