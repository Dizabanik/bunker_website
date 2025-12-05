import { Player, PlayerAttribute, AttributeType } from '../types';
import { PROFESSIONS, BIOLOGY, BODY_TYPES, HEALTH, HOBBIES, PHOBIAS, INVENTORY, BAGGAGE, FACTS, ACTIONS } from '../constants';

const getRandomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

const createAttribute = (value: string, type: AttributeType): PlayerAttribute => ({
  value,
  isRevealed: false,
  type
});

export const generateSinglePlayer = (id: string, name: string, isHost: boolean): Player => {
    return {
        id,
        name,
        isHost,
        isExiled: false,
        avatarId: Math.floor(Math.random() * 99) + 1, // 1-99 ID
        votesReceived: 0,
        hasJustified: false,
        stats: {
          profession: createAttribute(getRandomItem(PROFESSIONS), 'profession'),
          biology: createAttribute(getRandomItem(BIOLOGY), 'biology'),
          body: createAttribute(getRandomItem(BODY_TYPES), 'body'),
          health: createAttribute(getRandomItem(HEALTH), 'health'),
          hobby: createAttribute(getRandomItem(HOBBIES), 'hobby'),
          phobia: createAttribute(getRandomItem(PHOBIAS), 'phobia'),
          inventory: createAttribute(getRandomItem(INVENTORY), 'inventory'),
          baggage: createAttribute(getRandomItem(BAGGAGE), 'baggage'),
          fact: createAttribute(getRandomItem(FACTS), 'fact'),
          action: createAttribute(getRandomItem(ACTIONS), 'action'),
        }
    };
};

export const calculateCapacity = (totalPlayers: number): number => {
    // Rules: "Half survive. If odd, round down."
    return Math.floor(totalPlayers / 2);
};