import { GoogleGenAI, Type } from "@google/genai";
import { BunkerData, Player } from "../types";

// Note: Ensure process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBunkerScenario = async (): Promise<BunkerData> => {
  if (!process.env.API_KEY) {
    return {
      disaster: "Ядерная зима",
      description: "Мир погрузился в хаос после обмена ядерными ударами. Температура падает, радиация растет.",
      bunkerSize: 150,
      capacity: 10,
      foodSupply: "Консервы на 2 года",
      equipment: ["Генератор", "Система очистки воздуха"],
      location: "Подземный бункер под библиотекой",
      enemy: "Мародеры-каннибалы"
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: 'user',
          parts: [{ text: "Ты ведущий настольной игры Бункер. Сгенерируй атмосферный сценарий апокалипсиса на Русском языке. Верни строго JSON." }]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            disaster: { type: Type.STRING, description: "Название катастрофы" },
            description: { type: Type.STRING, description: "Художественное описание того, что случилось и почему нужно бежать" },
            bunkerSize: { type: Type.NUMBER, description: "Площадь в кв.м" },
            foodSupply: { type: Type.STRING, description: "Запас еды (время и тип)" },
            equipment: { type: Type.ARRAY, items: { type: Type.STRING } },
            location: { type: Type.STRING, description: "Где находится вход" },
            enemy: { type: Type.STRING, description: "Кто угрожает снаружи" }
          },
          required: ["disaster", "description", "bunkerSize", "foodSupply", "equipment", "location", "enemy"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      // Ensure capacity isn't in JSON, we calculate it in game logic based on players
      return { ...data, capacity: 0 } as BunkerData;
    }
    throw new Error("No text returned");
  } catch (error) {
    console.error("Gemini Gen Error:", error);
    return {
      disaster: "Биологическая угроза",
      description: "Неизвестный вирус вырвался из лабораторий.",
      bunkerSize: 120,
      capacity: 0,
      foodSupply: "Гидропоника (бесконечно)",
      equipment: ["Медблок", "Оружие"],
      location: "Военная база",
      enemy: "Зараженные"
    };
  }
};

export const judgeSurvival = async (survivors: Player[], bunker: BunkerData): Promise<string> => {
  if (!process.env.API_KEY) {
    return "История выживания недоступна без ключа API. Но, скорее всего, они выжили.";
  }

  const survivorDescriptions = survivors.map(p => 
    `- ${p.name}: ${p.stats.profession.value}, ${p.stats.biology.value}, ${p.stats.health.value}, Хобби: ${p.stats.hobby.value}, Инвентарь: ${p.stats.inventory.value}, Багаж: ${p.stats.baggage.value}, Факт: ${p.stats.fact.value}`
  ).join('\n');

  const prompt = `
    Ты рассказчик в финале игры "Бункер".
    
    Сценарий катастрофы: ${bunker.disaster}
    Описание: ${bunker.description}
    Бункер: ${bunker.location}, Еда: ${bunker.foodSupply}, Враги: ${bunker.enemy}.
    Оборудование: ${bunker.equipment.join(', ')}.
    
    Список людей, которые попали в бункер:
    ${survivorDescriptions}
    
    Задача: Напиши захватывающий и логичный рассказ (4-5 абзацев) на РУССКОМ языке о том, как эта группа прожила в бункере. 
    Проанализируй их профессии и навыки. Хватило ли им еды? Смогли ли они лечить болезни? Отбили ли атаку врагов?
    Кто стал лидером? Случились ли конфликты?
    Сделай вывод: выжила ли группа или погибла. Будь честным, если состав плохой - они должны погибнуть.
  `;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    return result.text || "";
  } catch (e) {
    return "Связь с архивом потеряна. Судьба выживших неизвестна.";
  }
};