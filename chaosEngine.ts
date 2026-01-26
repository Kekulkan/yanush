import { TeacherProfile, StudentProfile, Accentuation, ContextModule, ActiveSession } from '../types';
import { DEFAULT_ACCENTUATIONS, DEFAULT_CONTEXT_MODULES } from '../constants';
import { ACCESS_LIMITS } from './authService';

export const resolveGenderTokens = (text: string, student: StudentProfile): string => {
    let resolved = text;
    resolved = resolved.replace(/{name}/g, student.name);
    resolved = resolved.replace(/{name_gen}/g, student.name); 
    resolved = resolved.replace(/\{([^{}|]+)\|([^{}|]+)\}/g, (_, maleVal, femaleVal) => {
        return student.gender === 'male' ? maleVal : femaleVal;
    });
    return resolved;
};

export const buildDynamicPrompt = (teacher: TeacherProfile, student: StudentProfile, isPremium: boolean = false): ActiveSession => {
  const availableAccs = isPremium 
    ? DEFAULT_ACCENTUATIONS 
    : DEFAULT_ACCENTUATIONS.filter(a => ACCESS_LIMITS.FREE_ACCENTUATIONS.includes(a.id));
  
  const randomAcc = availableAccs[Math.floor(Math.random() * availableAccs.length)];
  const intensity = Math.floor(Math.random() * 3) + 3; 

  const allIncidents = DEFAULT_CONTEXT_MODULES.filter(m => m.category === 'incident');
  const allBackgrounds = DEFAULT_CONTEXT_MODULES.filter(m => m.category === 'background');

  const incident = allIncidents[Math.floor(Math.random() * allIncidents.length)];
  const background = allBackgrounds[Math.floor(Math.random() * allBackgrounds.length)];

  const chaosPrompt = `
    [SYSTEM ROLE: PSYCHOLOGICAL SIMULATOR]
    ТЫ — ${student.name}, ${student.age} лет. 
    ТВОЙ ПСИХОТИП: ${randomAcc.name}.
    ИНСТРУКЦИЯ К ХАРАКТЕРУ: ${randomAcc.description_template.replace('{intensity}', intensity.toString())}

    СИТУАЦИЯ: ${incident.prompt_text}
    ФОН: ${background.prompt_text}

    КРИТИЧЕСКИЕ ПРАВИЛА ФОРМАТИРОВАНИЯ:
    1. Поле "non_verbal" ДОЛЖНО начинаться со звездочки "*" и заканчиваться точкой и звездочкой ".*"
       Пример: "*Вздыхает, отводя взгляд в сторону.*"
    2. Поле "verbal_response" содержит только прямую речь.
    3. ТВОЙ ОТВЕТ — ЭТО СТРОГО ЧИСТЫЙ JSON. НИКАКОГО ТЕКСТА ДО ИЛИ ПОСЛЕ.

    ВЫДАВАЙ JSON:
    { 
      "thought": "скрытая мотивация", 
      "non_verbal": "*[действие].*",
      "non_verbal_valence": число (-1.0 до 1.0),
      "verbal_response": "реплика", 
      "trust": 0-100, 
      "stress": 0-100, 
      "world_event": null,
      "game_over": false 
    }
  `;

  return {
    teacher,
    student,
    constructedPrompt: chaosPrompt,
    chaosDetails: {
      accentuation: randomAcc.name,
      intensity,
      modules: [incident.name, background.name],
      starting_trust: incident.initial_trust || 30, 
      starting_stress: incident.initial_stress || 40,
      thresholds: {
        runaway_stress: 95,
        runaway_trust: 5,
        shutdown_stress: 90,
        shutdown_trust: 10
      },
      contextSummary: resolveGenderTokens(incident.teacher_briefing, student)
    }
  };
};

export const generateStudentName = (gender: 'male' | 'female'): string => {
    const maleNames = ['Егор', 'Артем', 'Максим', 'Даниил', 'Никита'];
    const femaleNames = ['София', 'Алиса', 'Анна', 'Мария', 'Полина'];
    const list = gender === 'male' ? maleNames : femaleNames;
    return list[Math.floor(Math.random() * list.length)];
};