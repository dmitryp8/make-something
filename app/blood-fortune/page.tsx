"use client";

import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Divider, Progress } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";

type BloodType = "A" | "B" | "AB" | "O";

interface FortuneArea {
  label: string;
  icon: string;
  score: number;
  advice: string;
}

interface BloodTypeProfile {
  type: BloodType;
  emoji: string;
  tagline: string;
  color: string;
  traits: string[];
  strengths: string[];
  challenges: string[];
  fortune: FortuneArea[];
  method: string[];
}

const PROFILES: Record<BloodType, BloodTypeProfile> = {
  A: {
    type: "A",
    emoji: "🌿",
    tagline: "Организованный перфекционист",
    color: "success",
    traits: ["Аккуратность", "Ответственность", "Чувствительность", "Терпение", "Сдержанность"],
    strengths: [
      "Отличный стратег — умеете планировать на годы вперёд",
      "Высокая надёжность: на вас всегда можно положиться",
      "Тонкий эстетический вкус и внимание к деталям",
    ],
    challenges: [
      "Склонность к перфекционизму мешает заканчивать начатое",
      "Трудно делегировать задачи другим",
      "Накапливаете стресс, не выражая эмоции",
    ],
    fortune: [
      { label: "Карьера", icon: "💼", score: 85, advice: "2024 год открывает возможности для роста через систематический труд. Ваша методичность будет вознаграждена." },
      { label: "Любовь", icon: "❤️", score: 70, advice: "Партнёр ценит вашу преданность. Позвольте себе быть чуть менее идеальным — это сблизит вас." },
      { label: "Здоровье", icon: "🌿", score: 75, advice: "Нервная система требует регулярного отдыха. Медитация и прогулки снизят уровень кортизола." },
      { label: "Финансы", icon: "💰", score: 80, advice: "Консервативный подход к деньгам защитит вас. Избегайте импульсивных вложений." },
    ],
    method: [
      "Составляйте подробный план на неделю, месяц, год — это ваша суперсила",
      "Практикуйте «правило 80%»: лучше сделать хорошо и вовремя, чем идеально и никогда",
      "Выделяйте 15 минут в день для осознанного расслабления",
      "Доверяйте близким — они тоже могут справляться с задачами",
      "Записывайте достижения, а не только ошибки",
    ],
  },
  B: {
    type: "B",
    emoji: "🔥",
    tagline: "Свободный творец",
    color: "warning",
    traits: ["Спонтанность", "Креативность", "Оптимизм", "Независимость", "Страсть"],
    strengths: [
      "Незаурядное творческое мышление и нестандартные решения",
      "Высокая энергия и заразительный энтузиазм",
      "Умение быстро адаптироваться к переменам",
    ],
    challenges: [
      "Сложно доводить дела до конца — интерес быстро угасает",
      "Импульсивные решения могут дорого обходиться",
      "Конфликты с людьми, требующими стабильности",
    ],
    fortune: [
      { label: "Карьера", icon: "💼", score: 78, advice: "Ваши идеи способны изменить проект или компанию. Найдите партнёра-«А», который поможет их реализовать." },
      { label: "Любовь", icon: "❤️", score: 88, advice: "Страстный период впереди. Ваша непосредственность привлекает — не гасите её ради «серьёзности»." },
      { label: "Здоровье", icon: "🌿", score: 72, advice: "Нужен режим сна. Ваш мозг работает на износ — восстановление критично для продуктивности." },
      { label: "Финансы", icon: "💰", score: 65, advice: "Заведите правило: перед любой покупкой выше 5000 руб. подождите 24 часа." },
    ],
    method: [
      "Превратите дела в игру — ставьте себе вызовы с дедлайнами",
      "Используйте «технику помидора» (25 мин работы / 5 мин отдых) для удержания фокуса",
      "Ведите «журнал идей» — не теряйте инсайты, они стоят денег",
      "Найдите ментора или партнёра с аналитическим складом ума",
      "Ежеутренняя физическая активность канализирует вашу энергию в нужное русло",
    ],
  },
  AB: {
    type: "AB",
    emoji: "✨",
    tagline: "Загадочный дипломат",
    color: "secondary",
    traits: ["Рациональность", "Чуткость", "Адаптивность", "Двойственность", "Глубина"],
    strengths: [
      "Редкая способность видеть ситуацию с разных сторон одновременно",
      "Природный медиатор — гасите конфликты в любом коллективе",
      "Сочетание логики и интуиции даёт уникальные решения",
    ],
    challenges: [
      "Внутренняя раздвоенность мешает принимать решения",
      "Окружающие не всегда понимают вас — чувствуете одиночество",
      "Склонность к перепадам настроения",
    ],
    fortune: [
      { label: "Карьера", icon: "💼", score: 90, advice: "Вы созданы для руководящих ролей и переговоров. Не недооценивайте свой уникальный взгляд на проблемы." },
      { label: "Любовь", icon: "❤️", score: 75, advice: "Вашему партнёру важна предсказуемость. Чуть больше открытости о своих чувствах — и отношения расцветут." },
      { label: "Здоровье", icon: "🌿", score: 80, advice: "Вы чутко реагируете на стресс. Йога или тай-чи подойдут идеально — тело и разум вместе." },
      { label: "Финансы", icon: "💰", score: 82, advice: "Диверсификация — ваш ключ. Не кладите все яйца в одну корзину, распределяйте риски." },
    ],
    method: [
      "Записывайте мысли перед сном — это снимет тревогу и прояснит решения",
      "Используйте метод «6 шляп мышления» при сложном выборе",
      "Планируйте время для себя — вам нужна перезарядка в одиночестве",
      "Доверяйте первой интуиции: у AB она особенно сильна",
      "Практикуйте чёткость в коммуникации — говорите прямо о своих потребностях",
    ],
  },
  O: {
    type: "O",
    emoji: "⚡",
    tagline: "Прирождённый лидер",
    color: "danger",
    traits: ["Решительность", "Уверенность", "Щедрость", "Целеустремлённость", "Прямота"],
    strengths: [
      "Природный лидер — люди инстинктивно следуют за вами",
      "Высокая стрессоустойчивость и выносливость",
      "Способность действовать быстро в кризисных ситуациях",
    ],
    challenges: [
      "Нетерпимость к слабости — в себе и других",
      "Конкурентность иногда переходит в агрессию",
      "Сложно слушать чужое мнение, когда уверены в своём",
    ],
    fortune: [
      { label: "Карьера", icon: "💼", score: 92, advice: "Момент для крупного шага — открытие бизнеса, повышение, новый проект. Ваша энергия на пике." },
      { label: "Любовь", icon: "❤️", score: 72, advice: "Партнёр нуждается в нежности, не только в силе. Покажите уязвимость — это не слабость, это доверие." },
      { label: "Здоровье", icon: "🌿", score: 88, advice: "Вы физически крепки, но игнорируете мелкие сигналы тела. Плановые обследования — не слабость." },
      { label: "Финансы", icon: "💰", score: 85, advice: "Рисковый аппетит поможет при правильном анализе. Изучите рынок перед следующим вложением." },
    ],
    method: [
      "Ставьте амбициозные цели — без этого скучаете и теряете эффективность",
      "Практикуйте активное слушание: пауза перед ответом удваивает вашу силу",
      "Найдите спарринг-партнёра или коуча — вам нужен тот, кто не боится спорить",
      "Регулярные интенсивные тренировки снижают агрессию и заряжают продуктивностью",
      "Раз в неделю спрашивайте себя: «Что я сегодня сделал для кого-то другого?»",
    ],
  },
};

const BLOOD_TYPES: BloodType[] = ["A", "B", "AB", "O"];

export default function BloodFortunePage() {
  const [selected, setSelected] = useState<BloodType | null>(null);

  const profile = selected ? PROFILES[selected] : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <div className="mb-4 text-5xl">🩸</div>
          <h1 className="font-[family-name:var(--font-bricolage)] text-4xl font-bold sm:text-5xl">
            Метод группы крови
          </h1>
          <p className="mt-4 text-slate-400">
            Японская практика определения характера, судьбы и управления будущим через группу крови
          </p>
        </motion.div>

        {/* Blood type selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <p className="mb-4 text-center text-sm text-slate-500 uppercase tracking-widest">
            Выберите вашу группу крови
          </p>
          <div className="flex justify-center gap-4">
            {BLOOD_TYPES.map((bt) => (
              <button
                key={bt}
                onClick={() => setSelected(bt)}
                className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-xl font-bold transition-all duration-200 ${
                  selected === bt
                    ? "border-red-400 bg-red-500/20 text-red-300 scale-110 shadow-lg shadow-red-500/20"
                    : "border-white/10 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
                }`}
              >
                {bt}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Profile */}
        <AnimatePresence mode="wait">
          {profile && (
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              {/* Identity card */}
              <Card className="border border-white/10 bg-slate-800/60">
                <CardBody className="gap-4 p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">{profile.emoji}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold">Группа {profile.type}</span>
                        <Chip color={profile.color as any} size="sm" variant="flat">
                          {profile.tagline}
                        </Chip>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {profile.traits.map((t) => (
                          <Chip key={t} size="sm" variant="bordered" className="border-white/20 text-slate-300">
                            {t}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Strengths & Challenges */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border border-green-500/20 bg-green-500/5">
                  <CardHeader className="pb-2 font-semibold text-green-400">
                    ✅ Сильные стороны
                  </CardHeader>
                  <CardBody className="pt-0">
                    <ul className="space-y-2">
                      {profile.strengths.map((s) => (
                        <li key={s} className="text-sm text-slate-300">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
                <Card className="border border-orange-500/20 bg-orange-500/5">
                  <CardHeader className="pb-2 font-semibold text-orange-400">
                    ⚠️ Зоны роста
                  </CardHeader>
                  <CardBody className="pt-0">
                    <ul className="space-y-2">
                      {profile.challenges.map((c) => (
                        <li key={c} className="text-sm text-slate-300">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              </div>

              {/* Fortune scores */}
              <Card className="border border-white/10 bg-slate-800/60">
                <CardHeader className="font-semibold text-white">
                  🔮 Прогноз по ключевым сферам
                </CardHeader>
                <Divider className="bg-white/10" />
                <CardBody className="space-y-5 pt-4">
                  {profile.fortune.map((area) => (
                    <div key={area.label}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {area.icon} {area.label}
                        </span>
                        <span className="text-sm text-slate-400">{area.score}%</span>
                      </div>
                      <Progress
                        value={area.score}
                        color={area.score >= 85 ? "success" : area.score >= 70 ? "warning" : "danger"}
                        className="mb-2"
                        size="sm"
                      />
                      <p className="text-xs text-slate-400">{area.advice}</p>
                    </div>
                  ))}
                </CardBody>
              </Card>

              {/* Method: how to manage your future */}
              <Card className="border border-purple-500/20 bg-purple-500/5">
                <CardHeader className="font-semibold text-purple-300">
                  🗺️ Метод управления будущим для группы {profile.type}
                </CardHeader>
                <Divider className="bg-white/10" />
                <CardBody className="pt-4">
                  <ol className="space-y-3">
                    {profile.method.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-300">
                        <span className="flex-shrink-0 font-bold text-purple-400">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </CardBody>
              </Card>

              {/* Disclaimer */}
              <p className="text-center text-xs text-slate-600">
                Основано на японской концепции кетсуэки-гата (血液型占い). Носит развлекательный характер.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!selected && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center text-slate-600 text-sm"
          >
            Выберите группу крови выше, чтобы увидеть свой профиль и план действий
          </motion.p>
        )}
      </div>
    </main>
  );
}
