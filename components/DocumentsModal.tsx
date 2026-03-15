import React from 'react';
import { X, BookOpen, FileText, Shield, Mail, HelpCircle, Zap, MessageSquare, Target, Award, AlertTriangle, Users, UserCheck, Eye, Skull, Heart, Trophy } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface DocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocId?: string;
}

const getDocuments = (setActiveDocId: (id: string) => void): Document[] => [
  {
    id: 'guide',
    title: 'Инструкция пользователя',
    icon: <HelpCircle size={18} />,
    content: (
      <div className="space-y-8 text-slate-300 leading-relaxed pb-20">
        <header className="border-b border-slate-700 pb-6">
          <h2 className="text-2xl font-black text-white uppercase italic">
            Инструкция по использованию тренажёра «Януш»
          </h2>
          <p className="text-slate-500 mt-2">Всё, что нужно знать для эффективной тренировки</p>
        </header>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4 flex items-center gap-2">
            <Target size={20} /> Что это такое?
          </h3>
          <p>
            <strong>«Януш»</strong> — это интерактивный симулятор для тренировки навыков работы с «трудными» подростками. 
            Вы играете роль учителя, а искусственный интеллект отыгрывает ученика с определённой психологической акцентуацией.
          </p>
          <p>
            Каждая сессия — это уникальная ситуация: случайный ученик, случайный контекст, случайная проблема. 
            Ваша задача — установить контакт, деэскалировать конфликт и помочь ребёнку, не навредив ему.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4 flex items-center gap-2">
            <Zap size={20} /> Как начать?
          </h3>
          <ol className="list-decimal ml-6 space-y-3">
            <li><strong>Нажмите «Начать тренинг»</strong> на главном экране</li>
            <li><strong>Настройте параметры сессии:</strong>
              <ul className="list-disc ml-6 mt-2 space-y-1 text-slate-400">
                <li>Ваше имя и пол (сохраняются для следующих сессий)</li>
                <li>Возраст и пол ученика</li>
                <li>Включить/выключить совещательную комиссию</li>
              </ul>
            </li>
            <li><strong>Прочитайте вводную:</strong> перед началом диалога вы увидите описание ситуации</li>
            <li><strong>Нажмите на аватар ученика</strong> чтобы просмотреть его «досье» — это поможет понять, с кем вы работаете</li>
            <li><strong>Начните диалог:</strong> пишите реплики в поле ввода внизу экрана</li>
          </ol>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4 flex items-center gap-2">
            <MessageSquare size={20} /> Как общаться?
          </h3>
          <div className="space-y-4">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <p className="font-bold text-white mb-2">💬 Реплики</p>
              <p className="text-slate-400">Просто пишите то, что скажете ученику. Например:</p>
              <p className="text-blue-300 italic mt-2">Я вижу, что тебе сейчас непросто. Хочешь поговорить?</p>
            </div>
            
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <p className="font-bold text-white mb-2">✨ Действия</p>
              <p className="text-slate-400">Используйте <strong>*звёздочки*</strong> для описания действий:</p>
              <p className="text-blue-300 italic mt-2">*Присаживаюсь рядом, но на расстоянии* Не против, если я тут посижу?</p>
            </div>
            
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <p className="font-bold text-white mb-2">🎤 Голосовой ввод</p>
              <p className="text-slate-400">Нажмите на иконку микрофона, чтобы диктовать реплики голосом.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-emerald-400 uppercase tracking-tight border-l-4 border-emerald-500 pl-4 flex items-center gap-2">
            <Trophy size={20} /> Условия победы
          </h3>
          <div className="bg-emerald-500/10 p-5 rounded-xl border border-emerald-500/20">
            <p className="font-bold text-emerald-400 mb-3">Идеальное разрешение ситуации:</p>
            <ul className="space-y-2 text-slate-300">
              <li>✅ Ученик полностью вам доверяет и успокоился</li>
              <li>✅ Конфликт деэскалирован</li>
              <li>✅ Вы нашли подход к ребёнку, не навредив ему</li>
            </ul>
            <p className="text-emerald-400/80 text-sm mt-4 italic">При идеальном исходе вы получите бонус к оценке комиссии</p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-red-400 uppercase tracking-tight border-l-4 border-red-500 pl-4 flex items-center gap-2">
            <Skull size={20} /> Условия проигрыша
          </h3>
          <div className="bg-red-500/10 p-5 rounded-xl border border-red-500/20">
            <p className="font-bold text-red-400 mb-3">Экстремальные исходы (сессия завершается автоматически):</p>
            <ul className="space-y-2 text-slate-300">
              <li>💨 <strong>Побег</strong> — ученик убежал (критически низкое доверие + высокий стресс)</li>
              <li>👊 <strong>Агрессия</strong> — ученик перешёл к физическим действиям</li>
              <li>🔇 <strong>Ступор</strong> — ученик полностью отключился и отказывается говорить</li>
            </ul>
            <p className="text-red-400/80 text-sm mt-4 italic">При экстремальном исходе оценка комиссии будет существенно ниже</p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4 flex items-center gap-2">
            <Eye size={20} /> Индикаторы состояния
          </h3>
          <p>Под каждой репликой ученика отображаются два ключевых параметра:</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
              <p className="font-bold text-emerald-400 mb-2">💚 Доверие</p>
              <p className="text-slate-400 text-sm">Насколько ученик вам доверяет. Растёт при эмпатии, активном слушании, уважении границ. Цель — довести до 100%.</p>
            </div>
            <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
              <p className="font-bold text-red-400 mb-2">❤️‍🔥 Стресс</p>
              <p className="text-slate-400 text-sm">Уровень напряжения ученика. Растёт при давлении, угрозах, обесценивании. Цель — снизить до 0%.</p>
            </div>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 mt-4">
            <p className="text-slate-300 text-sm">
              <strong>Цвет рамки реплики</strong> <span className="inline-block w-4 h-4 rounded-full bg-blue-500 align-middle ml-2 mr-2"></span> также отражает состояние: 
              <span className="text-emerald-400"> зелёный</span> — контакт установлен, 
              <span className="text-red-400"> красный</span> — критический стресс.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4 flex items-center gap-2">
            <Award size={20} /> Как оценивается?
          </h3>
          <p>После завершения сессии ваши действия оценивает <strong>комиссия экспертов</strong>:</p>
          
          <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
            <p className="font-bold text-emerald-400 mb-2">Основная комиссия</p>
            <p className="text-slate-400">6-8 профессионалов (психологи, педагоги, криминологи). Их оценки формируют итоговый балл (0-100). Подробнее — в разделе «Эксперты».</p>
          </div>
          
          <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
            <p className="font-bold text-amber-400 mb-2">Совещательная комиссия (опционально)</p>
            <p className="text-slate-400">Гротескные персонажи из «реального мира» — родители, чиновники, блогеры. Их мнения не влияют на балл, но показывают, с какими реакциями вы столкнётесь в реальности.</p>
          </div>

          <div className="mt-4">
            <p className="font-bold text-white mb-2">Шкала оценок:</p>
            <ul className="space-y-1 text-sm">
              <li><span className="text-emerald-400 font-bold">90-100:</span> Исключительная работа</li>
              <li><span className="text-blue-400 font-bold">75-89:</span> Хорошо, с мелкими недочётами</li>
              <li><span className="text-yellow-400 font-bold">60-74:</span> Удовлетворительно</li>
              <li><span className="text-orange-400 font-bold">40-59:</span> Ниже среднего, серьёзные ошибки</li>
              <li><span className="text-red-400 font-bold">0-39:</span> Плохо, грубые ошибки</li>
            </ul>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 mt-4">
            <p className="text-slate-400 text-sm">
              ⚠️ <strong>Важно:</strong> Для получения оценки необходимо провести диалог минимум из 10 реплик. 
              Слишком короткие сессии не анализируются.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4 flex items-center gap-2">
            <AlertTriangle size={20} /> Чего избегать?
          </h3>
          <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
            <ul className="space-y-2 text-slate-300">
              <li>❌ <strong>Угрозы и шантаж</strong> — Если не успокоишься, вызову родителей</li>
              <li>❌ <strong>Морализаторство</strong> — Ты должен понимать, что так нельзя</li>
              <li>❌ <strong>Обесценивание</strong> — Это всё ерунда, бывает и хуже</li>
              <li>❌ <strong>Шаблонные фразы</strong> — подростки мгновенно чувствуют фальшь</li>
              <li>❌ <strong>Перебивание</strong> — дайте ученику договорить</li>
              <li>❌ <strong>Долгое молчание</strong> — если вы не отвечаете, ученик начинает нервничать</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-white uppercase tracking-tight">Полезные советы</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <p className="font-bold text-blue-400 mb-2">👁️ Читайте цвета</p>
              <p className="text-slate-400 text-sm">Рамка реплик ученика меняет цвет: зелёный = контакт, красный = критическое состояние.</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <p className="font-bold text-blue-400 mb-2">📋 Изучите досье</p>
              <p className="text-slate-400 text-sm">Нажмите на аватар ученика, чтобы узнать его историю, семью, особенности характера.</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <p className="font-bold text-blue-400 mb-2">📚 Изучите акцентуации</p>
              <p className="text-slate-400 text-sm">В «Экспозиции» есть демо-режимы для каждого психотипа — посмотрите, как с ними работать.</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <p className="font-bold text-blue-400 mb-2">🎯 Не спешите</p>
              <p className="text-slate-400 text-sm">Лучше подумать перед репликой, чем потом исправлять ошибки.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-6 border-t border-slate-700">
          <h3 className="text-xl font-bold text-white uppercase tracking-tight">Горячие клавиши</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-slate-800/50 px-3 py-2 rounded-lg"><kbd className="bg-slate-700 px-2 py-0.5 rounded text-xs">Enter</kbd> — Отправить сообщение</div>
            <div className="bg-slate-800/50 px-3 py-2 rounded-lg"><kbd className="bg-slate-700 px-2 py-0.5 rounded text-xs">Shift+Enter</kbd> — Новая строка</div>
          </div>
        </section>
      </div>
    )
  },
  {
    id: 'experts',
    title: 'Состав экспертов',
    icon: <Users size={18} />,
    content: (
      <div className="space-y-8 text-slate-300 leading-relaxed pb-20">
        <header className="border-b border-slate-700 pb-6">
          <h2 className="text-2xl font-black text-white uppercase italic">
            Экспертный состав комиссий
          </h2>
          <p className="text-slate-500 mt-2">Кто оценивает ваши действия и по каким критериям</p>
        </header>

        {/* ОСНОВНАЯ КОМИССИЯ */}
        <section className="space-y-6">
          <h3 className="text-xl font-bold text-emerald-400 uppercase tracking-tight border-l-4 border-emerald-500 pl-4 flex items-center gap-2">
            <UserCheck size={20} /> Основная комиссия
          </h3>
          <p className="text-slate-400">Профессиональные эксперты, чьи оценки формируют итоговый балл (0-100).</p>
          
          <div className="space-y-4">
            <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5">
              <p className="font-bold text-white text-lg">Валентина Васильевна Громова</p>
              <p className="text-emerald-400 text-sm font-bold uppercase tracking-wider">Заслуженный учитель РФ, стаж 35 лет</p>
              <p className="text-slate-400 mt-2 text-sm">
                <strong>Фокус оценки:</strong> Здравый смысл, удержание авторитета, управление классом, границы.
              </p>
            </div>

            <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5">
              <p className="font-bold text-white text-lg">Аркадий Эдуардович Богословский</p>
              <p className="text-blue-400 text-sm font-bold uppercase tracking-wider">Профессор педагогики • Д.п.н., автор учебников</p>
              <p className="text-slate-400 mt-2 text-sm">
                <strong>Фокус оценки:</strong> Эмпатия, безоценочное принятие, фасилитация, отсутствие давления.
              </p>
            </div>

            <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5">
              <p className="font-bold text-white text-lg">Елена Павловна Строгая</p>
              <p className="text-pink-400 text-sm font-bold uppercase tracking-wider">Завуч по воспитательной работе • Администратор</p>
              <p className="text-slate-400 mt-2 text-sm">
                <strong>Фокус оценки:</strong> Соблюдение регламентов, защита школы от жалоб, документация.
              </p>
            </div>

            <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5">
              <p className="font-bold text-white text-lg">Дмитрий Олегович Петров</p>
              <p className="text-orange-400 text-sm font-bold uppercase tracking-wider">Криминолог / Безопасник • Специалист по профилактике</p>
              <p className="text-slate-400 mt-2 text-sm">
                <strong>Фокус оценки:</strong> Оценка рисков, деэскалация, безопасность жизни и здоровья.
              </p>
            </div>
          </div>
        </section>

        {/* СОВЕЩАТЕЛЬНАЯ КОМИССИЯ */}
        <section className="space-y-6">
          <h3 className="text-xl font-bold text-amber-400 uppercase tracking-tight border-l-4 border-amber-500 pl-4 flex items-center gap-2">
            <Users size={20} /> Совещательная комиссия
          </h3>
          <p className="text-slate-400">Гротескные персонажи, чьи оценки НЕ влияют на итоговый балл, но демонстрируют спектр реакций «реального мира».</p>
          
          <div className="space-y-4">
            <div className="bg-amber-500/5 p-5 rounded-xl border border-amber-500/20">
              <p className="font-bold text-white text-lg">Абрам Аркадьевич Романович</p>
              <p className="text-amber-400 text-sm font-bold uppercase tracking-wider">Меценат, попечитель школы, 67 лет</p>
              <p className="text-slate-400 mt-2 text-sm">
                «Архитектор 90-х», владелец всего. Оценивает: поддержали ли вы нарратив о личной ответственности и справедливости рынка.
              </p>
            </div>

            <div className="bg-amber-500/5 p-5 rounded-xl border border-amber-500/20">
              <p className="font-bold text-white text-lg">Трепонем Гельминтович Насонов-Грядущий</p>
              <p className="text-amber-400 text-sm font-bold uppercase tracking-wider">Партийный функционер, 58 лет</p>
              <p className="text-slate-400 mt-2 text-sm">
                Профессиональный чиновник, был всем по очереди. Оценивает: насколько вы «правильный», хотя сам не понимает критерии.
              </p>
            </div>

            <div className="bg-amber-500/5 p-5 rounded-xl border border-amber-500/20">
              <p className="font-bold text-white text-lg">Опир Лукич Упалнамоченов</p>
              <p className="text-amber-400 text-sm font-bold uppercase tracking-wider">Участковый, инспектор ПДН, 44 года</p>
              <p className="text-slate-400 mt-2 text-sm">
                Любит порядок и власть. Оценивает одно: сообщили вы «куда следует» или нет. Всё остальное — «укрывательство».
              </p>
            </div>

            <div className="bg-amber-500/5 p-5 rounded-xl border border-amber-500/20">
              <p className="font-bold text-white text-lg">Протоиерей Онуфрий (Скалозубов)</p>
              <p className="text-amber-400 text-sm font-bold uppercase tracking-wider">Боевой протоиерей, генерал-майор запаса, 54 года</p>
              <p className="text-slate-400 mt-2 text-sm">
                К Богу пришёл через войну. Оценивает: укрепляете вы «духовные скрепы» или разрушаете.
              </p>
            </div>

            <div className="bg-amber-500/5 p-5 rounded-xl border border-amber-500/20">
              <p className="font-bold text-white text-lg">TuMOX@ (Тимофей Мохов)</p>
              <p className="text-amber-400 text-sm font-bold uppercase tracking-wider">Зумер-блогер, 14 лет, 120K подписчиков</p>
              <p className="text-slate-400 mt-2 text-sm">
                Голос поколения. Оценивает по шкале «душно — нормально — база». Ценит честность и юмор, ненавидит фальшь.
              </p>
            </div>

            <div className="bg-amber-500/5 p-5 rounded-xl border border-amber-500/20">
              <p className="font-bold text-white text-lg">Людмила Аркадьевна Задушина</p>
              <p className="text-amber-400 text-sm font-bold uppercase tracking-wider">Гиперопекающая мать, 42 года</p>
              <p className="text-slate-400 mt-2 text-sm">
                Мать Ванечки из 7Б, эксперт по всему. Оценивает: как бы её Ванечка себя чувствовал. Любая твёрдость — «абьюз».
              </p>
            </div>

            <div className="bg-amber-500/5 p-5 rounded-xl border border-amber-500/20">
              <p className="font-bold text-white text-lg">Игорь Валерьевич Прапоренко</p>
              <p className="text-amber-400 text-sm font-bold uppercase tracking-wider">Военрук, подполковник запаса, 56 лет</p>
              <p className="text-slate-400 mt-2 text-sm">
                25 лет в армии, 15 в школе. Оценивает: навели вы порядок или развели демократию. «Разговоры» — для слабаков.
              </p>
            </div>

            <div className="bg-amber-500/5 p-5 rounded-xl border border-amber-500/20">
              <p className="font-bold text-white text-lg">Снежана Донатовна Световзор</p>
              <p className="text-amber-400 text-sm font-bold uppercase tracking-wider">Инстаграм-психолог, 34 года, 340K подписчиков</p>
              <p className="text-slate-400 mt-2 text-sm">
                Коуч, автор марафона «Роди себя заново». Оценивает: были ли вы «в теле» и «продышали ли боль».
              </p>
            </div>

            <div className="bg-amber-500/5 p-5 rounded-xl border border-amber-500/20">
              <p className="font-bold text-white text-lg">Аноним (Правдоруб_777)</p>
              <p className="text-amber-400 text-sm font-bold uppercase tracking-wider">Голос комментаторов</p>
              <p className="text-slate-400 mt-2 text-sm">
                Нет лица, но есть МНЕНИЕ. Обвинит кого-нибудь: учителя, ученика, родителей, систему или всех сразу.
              </p>
            </div>
          </div>
        </section>

        <section className="pt-6 border-t border-slate-700">
          <p className="text-slate-500 text-sm italic">
            Подробнее о педагогическом смысле совещательной комиссии — в разделе{' '}
            <button 
              onClick={() => setActiveDocId('methodology')} 
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              «Методологическое обоснование»
            </button>
            .
          </p>
        </section>
      </div>
    )
  },
  {
    id: 'methodology',
    title: 'Методологическое обоснование',
    icon: <BookOpen size={18} />,
    content: (
      <div className="space-y-8 text-slate-300 leading-relaxed pb-20">
        <header className="border-b border-slate-700 pb-6">
          <h2 className="text-2xl font-black text-white uppercase italic">
            Методологическое обоснование включения второго экспертного пула в систему супервизии педагогического симулятора «Януш»
          </h2>
        </header>

        <section>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-4">Преамбула</h3>
          <p>
            Настоящий документ обосновывает педагогическую, психологическую и методическую целесообразность включения в симулятор экстремальных школьных ситуаций второго (совещательного) пула экспертов, представленного намеренно гротескными, сатирическими и идеологически маркированными персонажами.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4">
            I. Принцип экологической валидности симуляции
          </h3>
          <div className="space-y-4">
            <h4 className="font-bold text-white">1.1. Проблема «стерильной» обратной связи</h4>
            <p>
              Традиционные обучающие симуляции страдают общим недостатком: обратная связь в них исходит исключительно от компетентных экспертов с согласованной системой ценностей. Это создаёт <strong>искажённую модель профессиональной реальности</strong>.
            </p>
            <p>В действительности педагог получает оценку своей работы от:</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>профессионального сообщества (коллеги, методисты, психологи) — <strong>редко</strong></li>
              <li>администрации с бюрократическими приоритетами — <strong>регулярно</strong></li>
              <li>родителей с разным уровнем компетентности и эмоциональной вовлечённости — <strong>постоянно</strong></li>
              <li>представителей силовых и контролирующих структур — <strong>эпизодически, но травматично</strong></li>
              <li>идеологизированных акторов (от религиозных до политических) — <strong>в зависимости от региона и контекста</strong></li>
              <li>медиа и анонимных комментаторов — <strong>при любом публичном резонансе</strong></li>
            </ul>
            <p>Исключение этих голосов из симуляции означает подготовку к профессии, которой не существует.</p>

            <h4 className="font-bold text-white">1.2. Теоретическое основание</h4>
            <p>
              Принцип экологической валидности (Bronfenbrenner, 1979) требует, чтобы обучающая среда воспроизводила существенные характеристики реальной среды, включая её противоречия, шум и иррациональные элементы. Согласно теории ситуативного обучения (Lave & Wenger, 1991), компетентность формируется не в абстрактном пространстве «правильных ответов», а в контексте реальных социальных практик со всей их сложностью.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4">
            II. Формирование навыка дифференциации обратной связи
          </h3>
          <h4 className="font-bold text-white">2.1. Проблема</h4>
          <p>Начинающие (и не только) педагоги часто не различают:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>профессиональную критику и идеологическую претензию</li>
            <li>обоснованную жалобу родителя и проекцию его тревоги</li>
            <li>правовое требование и злоупотребление властью</li>
            <li>экспертную рекомендацию и бюрократическую формальность</li>
          </ul>
          <p>Результат — либо некритичное принятие любой внешней оценки (путь к выгоранию и конформизму), либо тотальное отвержение обратной связи (путь к профессиональной стагнации).</p>

          <h4 className="font-bold text-white">2.2. Решение</h4>
          <p>
            Одновременное предъявление профессиональной и непрофессиональной оценки одной и той же ситуации создаёт условия для развития <strong>метакогнитивного навыка</strong>: способности анализировать источник, мотивацию и критерии оценивающего.
          </p>
          <p>Когда пользователь видит, что один и тот же его поступок:</p>
          <ul className="list-disc ml-6 space-y-1 italic text-slate-400">
            <li>Маргарита Сергеевна оценивает как «недостаточное контейнирование аффекта»</li>
            <li>Прапоренко — как «правильную твёрдость»</li>
            <li>Опир Упалнамоченов — как «несообщение о правонарушении»</li>
            <li>TuMOX@ (Тимофей Мохов) — как «ну норм, не орал хотя бы»</li>
            <li>Людмила Аркадьевна — как «травму на всю жизнь»</li>
          </ul>
          <p>...он вынужден сам определить, чья оптика релевантна, чья — нет, и почему. Это и есть профессиональное мышление.</p>

          <h4 className="font-bold text-white">2.3. Теоретическое основание</h4>
          <p>
            Концепция «эпистемологического развития» (Perry, 1970; Belenky et al., 1986) описывает переход от дуалистического мышления («есть правильный ответ, его знает авторитет») к контекстуальному («разные позиции имеют разные основания, я способен их оценить»). Второй пул экспертов форсирует этот переход.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4">
            III. Подготовка к давлению и профессиональная устойчивость
          </h3>
          <h4 className="font-bold text-white">3.1. Проблема</h4>
          <p>Педагог, впервые столкнувшийся с:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>угрозами прокуратурой от родителя</li>
            <li>давлением силовых структур по «экстремистской» статье</li>
            <li>идеологическими претензиями от представителей церкви или партии</li>
            <li>публичной травлей в соцсетях</li>
          </ul>
          <p>...часто испытывает шок, дезориентацию, чувство беспомощности. Это ведёт к двум деструктивным стратегиям: капитуляция (отказ от профессиональной позиции ради «спокойствия») или ригидная конфронтация (эскалация конфликта).</p>

          <h4 className="font-bold text-white">3.2. Решение</h4>
          <p>
            Предварительное знакомство с типичными паттернами давления в безопасной среде симуляции позволяет: снизить эффект неожиданности («я это уже видел»), распознать манипулятивные приёмы, подготовить эмоциональные и когнитивные ресурсы для ответа и отрепетировать удержание границ.
          </p>
          <p>Гротескность персонажей второго пула не снижает, а усиливает этот эффект: карикатура обнажает структуру манипуляции, делает её видимой и, следовательно, преодолимой.</p>

          <h4 className="font-bold text-white">3.3. Теоретическое основание</h4>
          <p>
            Концепция «прививки против стресса» (Meichenbaum, 1985) предполагает, что контролируемое воздействие стрессора в безопасных условиях повышает устойчивость к нему в реальности. Симуляция давления со стороны иррациональных оценщиков выполняет именно эту функцию.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4">
            IV. Психогигиеническая функция: юмор как ресурс
          </h3>
          <h4 className="font-bold text-white">4.1. Проблема</h4>
          <p>Профессиональное выгорание педагогов — эпидемия. Один из ключевых факторов — ощущение, что ты постоянно оцениваем, причём критерии оценки непрозрачны, противоречивы и часто абсурдны. Это создаёт хроническое напряжение и чувство несправедливости.</p>

          <h4 className="font-bold text-white">4.2. Решение</h4>
          <p>
            Юмор — доказанный механизм совладания со стрессом (Martin, 2007). Сатирическое изображение «оценщиков» позволяет:
          </p>
          <ul className="list-disc ml-6 space-y-1">
            <li>экстернализировать внутреннего критика (многие учителя носят в голове «голос» Людмилы Аркадьевны или Опира Упалнамоченова — теперь он становится внешним объектом, над которым можно смеяться)</li>
            <li>снизить значимость иррациональной критики через её обесценивание</li>
            <li>восстановить чувство контроля и агентности</li>
            <li>создать общий язык для обсуждения абсурдных ситуаций с коллегами</li>
          </ul>

          <h4 className="font-bold text-white">4.3. Теоретическое основание</h4>
          <p>
            Концепция «карнавальной культуры» (Бахтин, 1965) описывает смех как способ освобождения от власти авторитетов и догм. Перенос оценивающих инстанций в регистр гротеска позволяет пользователю временно выйти из-под их власти — и это терапевтично.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4">
            V. Социально-критическая функция: называние реальности
          </h3>
          <h4 className="font-bold text-white">5.1. Проблема</h4>
          <p>Существует негласный запрет на обсуждение того факта, что значительная часть оценки педагогического труда в России осуществляется некомпетентными, идеологизированными или прямо деструктивными агентами. Этот запрет усугубляет изоляцию учителя: он сталкивается с абсурдом, но не имеет языка для его описания.</p>

          <h4 className="font-bold text-white">5.2. Решение</h4>
          <p>
            Персонажи второго пула выполняют функцию называния: они делают видимым то, что обычно замалчивается. Трепонем Гельминтович — это не пародия на конкретного человека, это архетип бессмысленной бюрократической речи, с которой педагог сталкивается регулярно. Когда архетип назван и визуализирован — с ним можно работать.
          </p>
          <p>Это не «развлечение» и не «расслабон» (хотя и то, и другое — легитимные педагогические инструменты). Это — критическая педагогика в действии: обучение через осознание властных структур и механизмов подавления.</p>

          <h4 className="font-bold text-white">5.3. Теоретическое основание</h4>
          <p>
            Критическая педагогика (Freire, 1970; Giroux, 1988) рассматривает образование как пространство эмансипации. Одна из её ключевых практик — «называние мира» (naming the world): артикуляция того, что ощущается, но не проговаривается. Персонажи второго пула — инструмент такого называния.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4">
            VI. Дидактическая функция: эффект контраста
          </h3>
          <h4 className="font-bold text-white">6.1. Проблема</h4>
          <p>Пользователь, получающий только профессиональную обратную связь, может воспринимать её как «ещё одно мнение». Отсутствует масштаб для сравнения.</p>

          <h4 className="font-bold text-white">6.2. Решение</h4>
          <p>
            На фоне Опира Упалнамоченова и Снежаны Световзор разница между позицией Маргариты Сергеевны (психоаналитик) и Дмитрия Олеговича (когнитивно-поведенческий подход) становится осмысленной дискуссией внутри профессионального поля, а не «кто из них прав».
          </p>
          <p>Пользователь учится видеть:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>что есть профессиональное поле (с его внутренними дебатами)</li>
            <li>что есть внешний шум (идеология, невежество, корысть)</li>
            <li>где проходит граница</li>
          </ul>
          <p>Это формирует профессиональную идентичность.</p>

          <h4 className="font-bold text-white">6.3. Теоретическое основание</h4>
          <p>
            Принцип контраста — базовый механизм перцепции и когнитивной обработки. Предъявление «фигуры» на «фоне» усиливает различение. Второй пул — фон, на котором профессиональная экспертиза первого пула становится фигурой.
          </p>
        </section>

        <section className="space-y-6">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4">
            VII. Заключение
          </h3>
          <p>Включение второго экспертного пула в систему супервизии педагогического симулятора обосновано следующими соображениями:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-700 text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="p-3 border border-slate-700">Функция</th>
                  <th className="p-3 border border-slate-700">Механизм</th>
                  <th className="p-3 border border-slate-700">Результат</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr>
                  <td className="p-3 border border-slate-700">Экологическая валидность</td>
                  <td className="p-3 border border-slate-700">Воспроизведение реального разнообразия оценивающих инстанций</td>
                  <td className="p-3 border border-slate-700">Подготовка к реальной профессиональной среде</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-700">Дифференциация обратной связи</td>
                  <td className="p-3 border border-slate-700">Одновременное предъявление профессиональной и непрофессиональной оценки</td>
                  <td className="p-3 border border-slate-700">Развитие критического мышления</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-700">Стрессоустойчивость</td>
                  <td className="p-3 border border-slate-700">Предварительное знакомство с типичными паттернами давления</td>
                  <td className="p-3 border border-slate-700">Снижение уязвимости к манипуляциям</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-700">Психогигиена</td>
                  <td className="p-3 border border-slate-700">Юмор и ироническая дистанция</td>
                  <td className="p-3 border border-slate-700">Профилактика выгорания</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-700">Называние реальности</td>
                  <td className="p-3 border border-slate-700">Визуализация обычно замалчиваемых феноменов</td>
                  <td className="p-3 border border-slate-700">Эмансипация и профессиональная агентность</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-700">Эффект контраста</td>
                  <td className="p-3 border border-slate-700">Второй пул как фон для первого</td>
                  <td className="p-3 border border-slate-700">Укрепление профессиональной идентичности</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>Второй пул — не факультативное дополнение, а структурный элемент симулятора, обеспечивающий его образовательную полноту и соответствие реальности профессии.</p>
        </section>

        <section className="pt-10 border-t border-slate-800">
          <h3 className="text-lg font-bold text-white mb-4">Библиография</h3>
          <ul className="text-sm space-y-1 text-slate-400">
            <li>Бахтин М.М. Творчество Франсуа Рабле и народная культура средневековья и Ренессанса. — М., 1965.</li>
            <li>Bandura A. Social Foundations of Thought and Action. — Prentice Hall, 1986.</li>
            <li>Belenky M. et al. Women's Ways of Knowing. — Basic Books, 1986.</li>
            <li>Bronfenbrenner U. The Ecology of Human Development. — Harvard UP, 1979.</li>
            <li>Fanning R.M., Gaba D.M. The Role of Debriefing in Simulation-Based Learning // Simulation in Healthcare, 2(2), 2007.</li>
            <li>Freire P. Pedagogy of the Oppressed. — Continuum, 1970.</li>
            <li>Giroux H. Teachers as Intellectuals. — Bergin & Garvey, 1988.</li>
            <li>Lave J., Wenger E. Situated Learning. — Cambridge UP, 1991.</li>
            <li>Martin R.A. The Psychology of Humor. — Elsevier, 2007.</li>
            <li>Meichenbaum D. Stress Inoculation Training. — Pergamon, 1985.</li>
            <li>Perry W.G. Forms of Intellectual and Ethical Development in the College Years. — Holt, Rinehart & Winston, 1970.</li>
          </ul>
        </section>
      </div>
    )
  },
  {
    id: 'terms',
    title: 'Пользовательское соглашение',
    icon: <FileText size={18} />,
    content: (
      <div className="space-y-4 text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
        <h2 className="text-xl font-bold text-white mb-4">ЛИЦЕНЗИОННЫЙ ДОГОВОР-ОФЕРТА</h2>
        <p><strong>о предоставлении права использования программного комплекса «ЯНУШ»</strong><br/>
        Редакция № 1 от «15» марта 2026 г.</p>
        
        <h3 className="text-lg font-semibold text-white mt-6 mb-2">1. Термины и определения</h3>
        <p><strong>1.1. Лицензиар</strong> — Гражданин Российской Федерации Новиков Константин Алексеевич, применяющий специальный налоговый режим «Налог на профессиональный доход» (самозанятый), ИНН 550204842628, адрес электронной почты для обращений: support@yanush-sim.ru, являющийся правообладателем Платформы и предоставляющий доступ к ней на условиях настоящей Оферты.</p>
        <p><strong>1.2. Платформа (ПО «ЯНУШ»)</strong> — программный комплекс (интерактивный AI-тренажёр для педагогов), представляющий собой совокупность авторских программных алгоритмов, пользовательских интерфейсов, баз данных и логики промптов, предоставляемый по модели удалённого доступа (SaaS) через сеть Интернет по адресу: https://yanush-sim.ru. Платформа оркестрирует работу сторонних моделей машинного обучения (LLM) для генерации текстового контента в режиме реального времени.</p>
        <p><strong>1.3. Лицензиат (Пользователь)</strong> — любое полностью дееспособное физическое лицо, достигшее возраста 18 (восемнадцати) лет, либо юридическое лицо (индивидуальный предприниматель), совершившее Акцепт настоящей Оферты в порядке, предусмотренном разделом 2.</p>
        <p><strong>1.4. Сессия</strong> — однократный запуск Лицензиатом функционала симуляции диалога внутри Платформы, продолжающийся до логического завершения сценария (достижение успеха, наступление экстремального исхода) либо до добровольного прекращения Лицензиатом.</p>
        <p><strong>1.5. Пакет сессий</strong> — объём прав Лицензиата на использование Платформы, измеряемый в количестве доступных Сессий, зачисленных на баланс Личного кабинета.</p>
        <p><strong>1.6. Личный кабинет</strong> — персональный раздел Платформы, доступный Лицензиату после регистрации, содержащий информацию о балансе Сессий, истории использования и настройках аккаунта.</p>
        <p><strong>1.7. Тариф</strong> — совокупность условий использования Платформы (объём функциональности, количество Сессий), определяемая Лицензиаром. Актуальные Тарифы публикуются по адресу: https://yanush-sim.ru/#pricing.</p>
        <p><strong>1.8. Бесплатный тариф</strong> — тариф, предоставляющий Лицензиату ограниченный набор функциональных возможностей Платформы (базовые акцентуации, ограниченное количество Сессий) без внесения лицензионного вознаграждения. Конкретные ограничения Бесплатного тарифа указаны на странице Тарифов.</p>
        <p><strong>1.9. Платный тариф (Премиум)</strong> — тариф, предоставляющий Лицензиату расширенный набор функциональных возможностей (сложные психотипы, многослойные скрытые контексты, расширенные отчёты Комиссии экспертов) после внесения лицензионного вознаграждения.</p>
        <p><strong>1.10. Политика конфиденциальности</strong> — отдельный документ, определяющий порядок сбора, обработки, хранения и защиты персональных данных Лицензиата, доступный в разделе «Политика конфиденциальности» данного окна (или по адресу: https://yanush-sim.ru/privacy).</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">2. Порядок заключения Договора (Акцепт)</h3>
        <p>2.1. Настоящий документ является публичной офертой в соответствии со ст. 435, 437 Гражданского кодекса Российской Федерации (далее — ГК РФ).</p>
        <p>2.2. Акцепт — полное и безоговорочное принятие всех условий настоящей Оферты — совершается путём прохождения Лицензиатом процедуры регистрации на Платформе (создания Личного кабинета). Договор считается заключённым с момента завершения регистрации.</p>
        <p>2.3. С момента Акцепта Лицензиату предоставляется доступ к функционалу Бесплатного тарифа. Оплата Пакета сессий является основанием для активации функционала Платного тарифа и служит дополнительным подтверждением Акцепта.</p>
        <p>2.4. Совершая Акцепт, Лицензиат подтверждает, что:<br/>
        а) достиг возраста 18 (восемнадцать) лет и обладает полной дееспособностью;<br/>
        б) ознакомился с настоящей Офертой, Политикой конфиденциальности, описанием Тарифов и принимает их в полном объёме;<br/>
        в) даёт согласие на обработку своих персональных данных в объёме и порядке, определённых Политикой конфиденциальности;<br/>
        г) даёт согласие на получение сервисных (транзакционных) уведомлений от Платформы. Согласие на получение рекламных и маркетинговых рассылок запрашивается отдельно и может быть отозвано в любой момент через настройки Личного кабинета или путём перехода по ссылке отписки в письме (ст. 18 Федерального закона «О рекламе»).</p>
        <p>2.5. Возрастной ценз: Платформа предназначена исключительно для лиц, достигших 18 лет. Информационная продукция Платформы маркируется знаком «18+». Лицензиар вправе запросить подтверждение возраста Лицензиата. При установлении факта несовершеннолетия аккаунт блокируется незамедлительно.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">3. Предмет Договора</h3>
        <p>3.1. Лицензиар предоставляет Лицензиату право использования Платформы на условиях простой (неисключительной) лицензии (ст. 1236 ГК РФ) следующими способами:<br/>
        а) воспроизведение графической части интерфейса Платформы в оперативной памяти устройства Лицензиата путём обращения к Платформе через веб-браузер (удалённый доступ);<br/>
        б) взаимодействие с функциональными модулями Платформы в рамках предоставляемого пользовательского интерфейса в пределах функциональности выбранного Тарифа.</p>
        <p>3.2. Территория: Лицензия действует на территории всего мира без ограничений по территориальному признаку.</p>
        <p>3.3. Срок: Лицензия предоставляется на весь срок существования Личного кабинета Лицензиата — с момента Акцепта до момента удаления аккаунта по инициативе Лицензиата, блокировки аккаунта Лицензиаром или прекращения работы Платформы по основаниям, предусмотренным настоящей Офертой.</p>
        <p>3.4. Принцип «как есть» (AS IS): Платформа предоставляется без каких-либо гарантий, явных или подразумеваемых. Лицензиар не гарантирует:<br/>
        а) безошибочную, бесперебойную работу Платформы;<br/>
        б) соответствие Платформы конкретным целям, ожиданиям или профессиональным задачам Лицензиата;<br/>
        в) достоверность, точность, логическую непротиворечивость или педагогическую/психологическую корректность генерируемого Платформой текстового контента.</p>
        <p>3.5. Доступность (SLA): Лицензиар стремится обеспечить доступность Платформы, однако не гарантирует бесперебойный доступ (100% uptime). Лицензиар вправе проводить плановые технические работы с временным ограничением доступа. О плановых работах продолжительностью более 4 (четырёх) часов Лицензиар уведомляет Лицензиатов через интерфейс Платформы или по электронной почте не менее чем за 24 часа, при наличии технической возможности.</p>
        <p>3.6. Обновление Платформы: Лицензиар вправе в любое время без предварительного согласия Лицензиата изменять функциональность Платформы, добавлять или удалять модули, изменять используемые модели LLM, обновлять интерфейс, при условии сохранения основного назначения Платформы — симуляции кризисных диалогов. Указанные изменения не являются основанием для возврата лицензионного вознаграждения.</p>
        <p>3.7. Минимальные технические требования: Для использования Платформы Лицензиату необходимы: устройство (ПК, планшет, смартфон) с современным веб-браузером (Chrome, Firefox, Safari, Edge — актуальные версии), стабильное подключение к сети Интернет. Лицензиар не несёт ответственности за невозможность использования Платформы, вызванную несоответствием оборудования или программного обеспечения Лицензиата указанным требованиям.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">4. Специфика работы ИИ и предупреждения о контенте</h3>
        <p>4.1. Природа контента. Лицензиат осознаёт и принимает, что все диалоги, персонажи, оценки «Комиссии экспертов» и события внутри Платформы генерируются алгоритмами машинного обучения в режиме реального времени и не являются результатом работы реальных людей (психологов, юристов, педагогов).</p>
        <p>4.2. Не является профессиональной консультацией. Любые оценки «Комиссии экспертов» или иной контент, генерируемый Платформой, носят исключительно тренировочный (учебно-модельный) характер и не являются:<br/>
        а) профессиональным психологическим заключением или рекомендацией;<br/>
        б) юридической консультацией;<br/>
        в) медицинским диагнозом или назначением;<br/>
        г) методическим руководством, обязательным к применению.<br/>
        Лицензиар не несёт ответственности за любые последствия применения Лицензиатом навыков, техник или подходов, освоенных в ходе Сессий, в реальной профессиональной деятельности.</p>
        <p>4.3. Передача данных сторонним провайдерам. Лицензиат принимает к сведению и соглашается с тем, что текстовые данные, вводимые им в ходе Сессии (реплики в чате), передаются Провайдерам LLM API для обработки (генерации ответов). Серверы указанных провайдеров могут располагаться за пределами Российской Федерации. Лицензиар предпринимает организационные и технические меры по минимизации объёма передаваемых данных, однако не контролирует порядок их обработки, хранения и удаления на стороне Провайдеров LLM API. Перечень категорий получателей данных и применимые юрисдикции раскрыты в Политике конфиденциальности.</p>
        <p>4.4. Случайность генерации. Стартовые параметры виртуального собеседника (имя, пол, возраст, психотип, предыстория) формируются вычислительной средой Платформы случайным (псевдослучайным) образом. Любые совпадения с реальными людьми, событиями или обстоятельствами являются вероятностным артефактом работы алгоритма и не свидетельствуют о намерении Лицензиара моделировать конкретных лиц или ситуации.</p>
        <p>4.5. Предупреждение о характере контента (Content Warning). В рамках образовательных сценариев алгоритмы Платформы могут генерировать текст, содержащий симуляцию:<br/>
        • эмоционального сопротивления, агрессии, истерики со стороны виртуального персонажа;<br/>
        • манипулятивного поведения;<br/>
        • описаний ситуаций буллинга, семейного неблагополучия, социальной изоляции;<br/>
        • упоминаний суицидальных мыслей, самоповреждения, тревожных и депрессивных состояний виртуального персонажа.<br/>
        Указанный контент генерируется исключительно в контексте обучения педагогов распознаванию и профилактике кризисных состояний у подростков и не является пропагандой, побуждением, инструкцией к совершению противоправных действий, романтизацией насилия или суицида (в смысле ст. 110, 110.1, 110.2 УК РФ, Федерального закона № 436-ФЗ «О защите детей от информации, причиняющей вред их здоровью и развитию»).</p>
        <p>4.6. Эмоциональное благополучие Лицензиата. Лицензиат принимает на себя все риски эмоционального воздействия, связанного с взаимодействием с контентом Платформы. В случае возникновения эмоционального дискомфорта по итогам Сессии Лицензиат вправе:<br/>
        • немедленно прекратить Сессию;<br/>
        • обратиться на Телефон доверия: 8-800-2000-122 (бесплатно, круглосуточно по РФ);<br/>
        • обратиться к квалифицированному специалисту (психологу, психотерапевту).</p>
        <p>4.7. Отказ Лицензиара от гарантий в отношении третьих лиц. Лицензиар не несёт ответственности за перебои в работе Платформы, искажение результатов генерации или утрату данных, вызванные действиями (бездействием) Провайдеров LLM API, операторов связи или иных третьих лиц.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">5. Обязанности и запреты для Лицензиата</h3>
        <p>5.1. Лицензиат обязуется:<br/>
        а) использовать Платформу добросовестно, исключительно в целях профессионального обучения и развития навыков педагогического общения;<br/>
        б) обеспечивать конфиденциальность своих учётных данных (логин, пароль) и не передавать их третьим лицам;<br/>
        в) самостоятельно отслеживать изменения настоящей Оферты и Политики конфиденциальности;<br/>
        г) соблюдать требования применимого законодательства при использовании Платформы.</p>
        <p>5.2. Запрет на ввод персональных данных третьих лиц. Лицензиату категорически запрещается вводить в чат Платформы персональные данные третьих лиц: реальные фамилии, имена, контактные данные, медицинские диагнозы, иные сведения, позволяющие идентифицировать конкретных реальных учеников, коллег или иных физических лиц. Вся ответственность за нарушение Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» в данном случае возлагается на Лицензиата.</p>
        <p>5.3. Запрет на противоправное использование. Лицензиату запрещается использовать Платформу для:<br/>
        а) отработки техник манипуляции, психологического давления или иного противоправного воздействия на реальных несовершеннолетних или иных лиц;<br/>
        б) создания контента, пропагандирующего насилие, суицид, дискриминацию;<br/>
        в) любых иных целей, противоречащих законодательству Российской Федерации и назначению Платформы.</p>
        <p>5.4. Технические запреты. Лицензиату строго запрещается:<br/>
        а) осуществлять декомпиляцию, дизассемблирование, обратную разработку (реверс-инжиниринг) исходного кода Платформы или её отдельных компонентов;<br/>
        б) предпринимать попытки обхода, модификации или подмены алгоритмов Платформы, в том числе путём инъекции промптов (prompt injection), jailbreak-атак и аналогичных техник;<br/>
        в) осуществлять автоматизированное обращение к Платформе (парсинг, скрейпинг, использование ботов) без письменного разрешения Лицензиара;<br/>
        г) систематически копировать, записывать экран (screencast) или иным образом фиксировать содержимое интерфейса Платформы в целях создания конкурирующих продуктов, обучения собственных моделей машинного обучения или иного коммерческого использования;<br/>
        д) передавать, продавать, сдавать в аренду, предоставлять в безвозмездное пользование свою учётную запись третьим лицам;<br/>
        е) использовать одну учётную запись одновременно более чем с 1 (одного) устройства. При обнаружении одновременных подключений Лицензиар вправе ограничить доступ.</p>
        <p>5.5. Лицензиат несёт ответственность за все действия, совершённые с использованием его учётных данных. В случае несанкционированного доступа к аккаунту Лицензиат обязан незамедлительно уведомить Лицензиара по адресу support@yanush-sim.ru.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">6. Порядок списания Сессий</h3>
        <p>6.1. При старте новой симуляции с баланса Личного кабинета Лицензиата списывается 1 (одна) Сессия.</p>
        <p>6.2. Сессия считается потреблённой (использованной) Лицензиатом с момента списания, независимо от её фактической продолжительности, в том числе если Лицензиат по собственной инициативе прервал диалог, закрыл окно браузера, утратил соединение с сетью Интернет или прекратил взаимодействие иным способом.</p>
        <p>6.3. Возврат Сессии при техническом сбое. В случае если Сессия была прервана вследствие фатальной системной ошибки (подтверждённого сбоя на стороне Провайдеров LLM API или серверной инфраструктуры Платформы), не позволившей Лицензиату взаимодействовать с Платформой, списанная Сессия подлежит возврату на баланс Личного кабинета в течение 48 (сорока восьми) часов с момента обращения Лицензиата в поддержку по адресу support@yanush-sim.ru с указанием даты, времени и описания проблемы. Решение о возврате Сессии принимается Лицензиаром на основании анализа серверных логов.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">7. Стоимость и порядок расчётов</h3>
        <p>7.1. Порядок определения размера лицензионного вознаграждения.<br/>
        7.1.1. Размер лицензионного вознаграждения определяется Лицензиаром и указывается в Тарифах, опубликованных на странице Платформы по адресу: https://yanush-sim.ru/#pricing (далее — Страница Тарифов). Страница Тарифов является неотъемлемой частью настоящей Оферты.<br/>
        7.1.2. Тарифы содержат: наименование Пакета сессий, количество Сессий в Пакете, стоимость Пакета в рублях Российской Федерации, перечень доступных функциональных возможностей.<br/>
        7.1.3. Конкретный размер лицензионного вознаграждения, подлежащего уплате Лицензиатом, определяется в момент оформления заказа (нажатия кнопки «Оплатить» / «Купить» в интерфейсе Платформы) и равен стоимости выбранного Лицензиатом Пакета сессий, отображённой на Странице Тарифов на момент оформления заказа.<br/>
        7.1.4. Факт совершения оплаты Лицензиатом по цене, указанной на Странице Тарифов, подтверждает согласие Лицензиата с размером лицензионного вознаграждения за соответствующий Пакет сессий.<br/>
        7.1.5. Лицензиар вправе изменять стоимость Пакетов сессий в одностороннем порядке путём обновления Страницы Тарифов. Изменение стоимости не распространяется на ранее оплаченные Пакеты.</p>
        <p>7.2. Бесплатный тариф.<br/>
        7.2.1. В рамках Бесплатного тарифа лицензия предоставляется Лицензиату на безвозмездной основе (лицензионное вознаграждение не взимается). Безвозмездный характер лицензии в рамках Бесплатного тарифа прямо предусмотрен настоящим Договором в соответствии с абз. 1 п. 5 ст. 1235 ГК РФ (оговорка «если договором не предусмотрено иное»).<br/>
        7.2.2. Объём функциональности Бесплатного тарифа (доступные акцентуации, количество Сессий, ограничения) определяется на Странице Тарифов.<br/>
        7.2.3. Лицензиар вправе в любой момент изменить условия Бесплатного тарифа (включая количество доступных Сессий) или прекратить его предоставление с уведомлением Лицензиатов через интерфейс Платформы.</p>
        <p>7.3. Оплата производится безналичным путём в форме 100% предоплаты через платёжные инструменты, интегрированные в Платформу.</p>
        <p>7.4. Обязательство Лицензиара по предоставлению доступа к оплаченному Пакету сессий считается исполненным в момент зачисления соответствующего количества Сессий на баланс Личного кабинета Лицензиата.</p>
        <p>7.5. Срок использования оплаченных Сессий. Оплаченные Сессии доступны для использования в течение 12 (двенадцати) месяцев с момента зачисления на баланс, если иное не указано в описании конкретного Пакета. По истечении указанного срока неиспользованные оплаченные Сессии сгорают без компенсации, о чём Лицензиар уведомляет Лицензиата по электронной почте не менее чем за 14 (четырнадцать) дней до истечения срока.</p>
        <p>7.6. Условия возврата денежных средств.<br/>
        7.6.1. Предметом настоящего Договора является предоставление права использования программы для ЭВМ (ст. 1235 ГК РФ). Результат предоставления лицензии потребляется Лицензиатом в момент запуска каждой Сессии.<br/>
        7.6.2. Совершая оплату, Лицензиат подтверждает своё согласие на немедленное предоставление доступа к функциональности Платформы и осведомлённость об утрате права на отказ от исполнения Договора в части использованных Сессий.<br/>
        7.6.3. Возврат лицензионного вознаграждения за использованные Сессии не производится.<br/>
        7.6.4. В случае если Лицензиат — физическое лицо (потребитель) — заявляет отказ от Договора в порядке ст. 32 Закона РФ «О защите прав потребителей» до использования всех оплаченных Сессий, Лицензиар возвращает стоимость неиспользованных Сессий за вычетом фактически понесённых расходов (в том числе комиссий платёжных систем) в течение 10 (десяти) рабочих дней с момента получения заявления.<br/>
        7.6.5. Лицензиатам — юридическим лицам и индивидуальным предпринимателям — возврат неиспользованных Сессий осуществляется в порядке, согласованном Сторонами путём обмена письмами по электронной почте.</p>
        <p>7.7. Кассовый чек. Лицензиар формирует электронный кассовый чек (как плательщик НПД) и направляет его Лицензиату на адрес электронной почты, указанный при регистрации, или предоставляет ссылку на чек в интерфейсе Платформы.</p>
        <p>7.8. Промокоды и бонусные Сессии. Лицензиар вправе предоставлять Лицензиату промокоды для начисления бонусных Сессий. Бонусные Сессии:<br/>
        • не имеют денежного эквивалента и не подлежат обмену на денежные средства;<br/>
        • не подлежат возврату или компенсации при удалении аккаунта;<br/>
        • при выявлении создания множественных учётных записей (мультиаккаунтинга) одним лицом для повторной активации промокодов аннулируются без уведомления.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">8. Интеллектуальная собственность</h3>
        <p>8.1. Права Лицензиара. Исключительные права на Платформу как составное произведение, включая (но не ограничиваясь): архитектуру, исходный код, движок «Chaos Engine», пользовательские интерфейсы, дизайн, логику промптов, базы данных сценариев, наименование «ЯНУШ», — принадлежат Лицензиару. Настоящий Договор не предусматривает передачу (отчуждение) каких-либо исключительных прав Лицензиату.</p>
        <p>8.2. Ограничения использования: Перечень ограничений и запретов, касающихся использования Платформы, установлен в разделе 5 настоящей Оферты.</p>
        <p>8.3. Лицензия на использование обезличенных данных Сессий. Лицензиат безвозмездно предоставляет Лицензиару неисключительное право использовать деперсонализированные (обезличенные) данные из Сессий Лицензиата следующим образом:<br/>
        • Объём: обезличенные логи диалогов (текстовые реплики, из которых удалены или заменены любые данные, позволяющие прямо или косвенно установить личность Лицензиата или третьих лиц) и агрегированная статистика использования (средние значения метрик, частотность сценариев, длительность сессий и т.п.);<br/>
        • Цели: улучшение алгоритмов Платформы, внутренняя аналитика, научные исследования и публикации, демонстрация обезличённых примеров диалогов в маркетинговых материалах Платформы без идентификации Лицензиата;<br/>
        • Территория: без ограничений;<br/>
        • Срок: в течение всего срока правовой охраны результатов интеллектуальной деятельности, входящих в состав Платформы;<br/>
        • Право на отзыв: Лицензиат вправе направить запрос на исключение своих данных из будущих выборок (на адрес support@yanush-sim.ru). Ранее опубликованные агрегированные (неиндивидуализированные) материалы отзыву не подлежат.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">9. Персональные данные</h3>
        <p>9.1. Совершая Акцепт, Лицензиат даёт своё информированное и добровольное согласие на обработку персональных данных в объёме, целях, способами и в сроки, определённые Политикой конфиденциальности (https://yanush-sim.ru/privacy).</p>
        <p>9.2. Политика конфиденциальности является неотъемлемой частью настоящей Оферты и содержит:<br/>
        • перечень обрабатываемых персональных данных;<br/>
        • цели обработки;<br/>
        • перечень третьих лиц (категорий получателей), которым могут быть переданы данные;<br/>
        • сроки хранения данных;<br/>
        • порядок отзыва согласия и удаления данных;<br/>
        • меры защиты данных.</p>
        <p>9.3. Лицензиат вправе в любое время отозвать согласие на обработку персональных данных, направив уведомление на адрес support@yanush-sim.ru. Отзыв согласия влечёт невозможность дальнейшего использования Платформы и удаление аккаунта в порядке п. 11.1 настоящей Оферты.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">10. Изменение условий Оферты</h3>
        <p>10.1. Лицензиар вправе в одностороннем порядке изменять условия настоящей Оферты.</p>
        <p>10.2. Новая редакция Оферты вступает в силу по истечении 10 (десяти) календарных дней с момента её размещения по адресу: https://yanush-sim.ru/offer, если в новой редакции не указан более длительный срок.</p>
        <p>10.3. Лицензиар уведомляет Лицензиатов о существенных изменениях условий Оферты по электронной почте и/или через интерфейс Платформы. Лицензиат обязан самостоятельно отслеживать актуальную редакцию Оферты.</p>
        <p>10.4. Продолжение использования Платформы после вступления изменений в силу означает согласие Лицензиата с новой редакцией Оферты. Если Лицензиат не согласен с изменениями, он вправе прекратить использование Платформы и удалить аккаунт в порядке п. 11.1.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">11. Блокировка, удаление аккаунта, прекращение работы Платформы</h3>
        <p>11.1. Удаление аккаунта по инициативе Лицензиата. Лицензиат вправе в любой момент направить запрос на удаление учётной записи на адрес support@yanush-sim.ru. Аккаунт и связанные с ним персональные данные удаляются в течение 30 (тридцати) календарных дней с момента получения запроса. Обезличенные агрегированные данные (п. 8.3) сохраняются. Неиспользованные Сессии при добровольном удалении аккаунта:<br/>
        • бесплатные и бонусные — аннулируются без компенсации;<br/>
        • оплаченные — подлежат возврату в порядке п. 7.5.4 (для потребителей) или п. 7.5.5 (для юридических лиц и ИП) при условии, что Лицензиат одновременно с запросом на удаление заявляет требование о возврате.</p>
        <p>11.2. Блокировка аккаунта Лицензиаром. При нарушении Лицензиатом пп. 5.2, 5.3, 5.4 настоящей Оферты, а также при обнаружении попыток взлома, мультиаккаунтинга или иного злоупотребления Лицензиар вправе:<br/>
        а) приостановить доступ Лицензиата к Платформе с направлением уведомления по электронной почте с указанием причины;<br/>
        б) заблокировать аккаунт Лицензиата окончательно.<br/>
        Лицензиат вправе направить мотивированное возражение в течение 10 (десяти) рабочих дней с момента получения уведомления. Лицензиар рассматривает возражение в течение 10 (десяти) рабочих дней; принятое решение является окончательным. Оплаченные неиспользованные Сессии при блокировке за нарушение условий Оферты не компенсируются.</p>
        <p>11.3. Прекращение работы Платформы. Лицензиар вправе принять решение о прекращении функционирования Платформы (полном или частичном), уведомив Лицензиатов не менее чем за 30 (тридцать) календарных дней по электронной почте и через интерфейс Платформы. В этом случае Лицензиар возвращает стоимость неиспользованных оплаченных Сессий пропорционально их остатку на балансе в течение 30 (тридцати) календарных дней с даты прекращения работы.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">12. Ответственность Сторон</h3>
        <p>12.1. Ограничение ответственности Лицензиара. Максимальная совокупная ответственность Лицензиара перед Лицензиатом по настоящему Договору (по всем основаниям, включая убытки, неустойки, штрафы) строго ограничивается суммой, фактически уплаченной данным Лицензиатом за последние 3 (три) календарных месяца, предшествующих событию, послужившему основанием для предъявления требования.</p>
        <p>12.2. Лицензиар ни при каких обстоятельствах не несёт ответственности за:<br/>
        а) косвенные, случайные, штрафные убытки, упущенную выгоду, потерю данных Лицензиата;<br/>
        б) качество, скорость и бесперебойность работы Провайдеров LLM API, каналов связи и иных сервисов третьих лиц;<br/>
        в) действия Лицензиата, совершённые в нарушение раздела 5 настоящей Оферты;<br/>
        г) последствия применения Лицензиатом в реальной профессиональной деятельности навыков, техник и подходов, освоенных с помощью Платформы;<br/>
        д) эмоциональный дискомфорт, причинённый Лицензиату содержанием генерируемого контента (п. 4.5, 4.6).</p>
        <p>12.3. Ответственность Лицензиата. Лицензиат обязуется возместить Лицензиару все убытки (включая судебные расходы, штрафы контролирующих органов), понесённые Лицензиаром вследствие нарушения Лицензиатом пп. 5.2, 5.3, 5.4 настоящей Оферты, а также вследствие предъявления третьими лицами претензий, связанных с неправомерными действиями Лицензиата при использовании Платформы.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">13. Форс-мажор</h3>
        <p>13.1. Стороны освобождаются от ответственности за частичное или полное неисполнение обязательств по настоящему Договору, если такое неисполнение явилось следствием обстоятельств непреодолимой силы, возникших после Акцепта, которые Сторона не могла предвидеть и предотвратить разумными мерами.</p>
        <p>13.2. К обстоятельствам непреодолимой силы относятся, в том числе: стихийные бедствия; военные действия; террористические акты; решения органов государственной власти (включая блокировки со стороны Роскомнадзора, введение санкций); эпидемии и пандемии; масштабные сбои телекоммуникационных сетей, центров обработки данных и облачных сервисов сторонних провайдеров; кибератаки.</p>
        <p>13.3. Сторона, для которой наступили обстоятельства непреодолимой силы, обязана уведомить другую Сторону в разумный срок. Если обстоятельства непреодолимой силы длятся более 90 (девяноста) календарных дней, любая из Сторон вправе расторгнуть Договор с возвратом Лицензиату стоимости неиспользованных оплаченных Сессий.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">14. Порядок разрешения споров</h3>
        <p>14.1. Претензионный порядок. До обращения в суд Стороны обязуются соблюдать обязательный претензионный порядок разрешения споров. Претензия направляется в письменной форме по электронной почте (Лицензиату — на адрес, указанный при регистрации; Лицензиару — на адрес support@yanush-sim.ru). Срок рассмотрения претензии — 10 (десять) рабочих дней с даты её получения.</p>
        <p>14.2. Подсудность.<br/>
        а) Споры с Лицензиатами — юридическими лицами и индивидуальными предпринимателями — подлежат рассмотрению в Арбитражном суде по месту нахождения (регистрации) Лицензиара.<br/>
        б) Споры с Лицензиатами — физическими лицами (потребителями) — рассматриваются судами общей юрисдикции в порядке, установленном законодательством Российской Федерации, в том числе Законом РФ «О защите прав потребителей» (по выбору потребителя: по месту нахождения Лицензиара, по месту жительства или пребывания потребителя, по месту заключения или исполнения договора).</p>
        <p>14.3. Применимое право: настоящий Договор регулируется и толкуется в соответствии с законодательством Российской Федерации.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">15. Заключительные положения</h3>
        <p>15.1. Разделимость (Severability). Если какое-либо положение настоящего Договора будет признано судом недействительным, незаконным или неисполнимым, это не влечёт недействительности остальных положений Договора. Остальные положения сохраняют полную юридическую силу и подлежат исполнению.</p>
        <p>15.2. Полнота соглашения. Настоящая Оферта (совместно с Политикой конфиденциальности и описанием Тарифов) представляет собой полное соглашение между Лицензиаром и Лицензиатом относительно предмета Договора и заменяет все предшествующие устные и письменные договорённости.</p>
        <p>15.3. Уступка прав. Лицензиат не вправе уступать свои права и обязанности по настоящему Договору третьим лицам без письменного согласия Лицензиара. Лицензиар вправе уступить свои права и обязанности по Договору третьему лицу (правопреемнику), уведомив об этом Лицензиата.</p>
        <p>15.4. Юридическая сила электронных сообщений. Стороны признают юридическую силу за электронными сообщениями и документами, направленными по адресам электронной почты, указанным в настоящей Оферте и при регистрации. Лицензиат несёт риск неполучения сообщений вследствие неактуальности указанного им адреса электронной почты.</p>
        <p>15.5. Языковая версия. В случае расхождения между версиями Оферты на разных языках (при их наличии) приоритет имеет версия на русском языке.</p>
        <p>15.6. Изменение статуса Лицензиара. В случае изменения организационно-правовой формы или налогового статуса Лицензиара (в том числе переход в статус индивидуального предпринимателя, создание юридического лица) все ранее заключённые договоры сохраняют силу. Правопреемником по обязательствам выступает Лицензиар в новом статусе; Лицензиат уведомляется об этом по электронной почте.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">16. Реквизиты Лицензиара</h3>
        <ul className="space-y-2 mb-6">
          <li><strong>Статус:</strong> Плательщик налога на профессиональный доход (Самозанятый)</li>
          <li><strong>ФИО:</strong> Новиков Константин Алексеевич</li>
          <li><strong>ИНН:</strong> 550204842628</li>
          <li><strong>Банковский счёт:</strong> 40817810838042105014</li>
          <li><strong>Банк:</strong> ПАО Сбербанк</li>
          <li><strong>БИК:</strong> 044525225</li>
          <li><strong>Корр. счёт:</strong> 30101810400000000225</li>
          <li><strong>Email (поддержка):</strong> support@yanush-sim.ru</li>
          <li><strong>Адрес Оферты:</strong> https://yanush-sim.ru/offer</li>
          <li><strong>Политика конфиденциальности:</strong> https://yanush-sim.ru/privacy</li>
        </ul>
      </div>
    )
  },
  {
    id: 'privacy',
    title: 'Политика конфиденциальности',
    icon: <Shield size={18} />,
    content: (
      <div className="space-y-4 text-slate-400 text-sm leading-relaxed whitespace-pre-wrap pb-10">
        <h2 className="text-xl font-bold text-white mb-4">ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ</h2>
        <p><strong>в отношении обработки персональных данных пользователей платформы «ЯНУШ»</strong><br/>
        Редакция № 1 от «15» марта 2026 г.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">1. ОБЩИЕ ПОЛОЖЕНИЯ</h3>
        <p>1.1. Настоящая Политика в отношении обработки персональных данных (далее — Политика) разработана в соответствии с Конституцией Российской Федерации, Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» (далее — 152-ФЗ), Постановлением Правительства РФ от 01.11.2012 № 1119 «Об утверждении требований к защите персональных данных при их обработке в информационных системах персональных данных», иными нормативными правовыми актами Российской Федерации в области персональных данных.</p>
        <p>1.2. Оператор персональных данных (далее — Оператор):<br/>
        Статус: Плательщик налога на профессиональный доход (самозанятый)<br/>
        ФИО: Новиков Константин Алексеевич<br/>
        ИНН: 550204842628<br/>
        Местонахождение: г. Москва, Российская Федерация<br/>
        Email для обращений по вопросам ПДн: support@yanush-sim.ru</p>
        <p>1.3. Настоящая Политика применяется ко всей информации, которую Оператор получает о посетителях и пользователях веб-сайта https://yanush-sim.ru (далее — Сайт, Платформа), а также определяет порядок обработки и защиты персональных данных.</p>
        <p>1.4. Настоящая Политика является неотъемлемой частью Лицензионного договора-оферты о предоставлении права использования программного комплекса «ЯНУШ (JANUS)» (далее — Оферта), размещенной по адресу: https://yanush-sim.ru/offer. Термины, не определенные в настоящей Политике, используются в значениях, установленных Офертой.</p>
        <p>1.5. Оператор ставит своей важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод человека и гражданина при обработке его персональных данных, в том числе защиту прав на неприкосновенность частной жизни, личную и семейную тайну.</p>
        <p>1.6. Уведомление Роскомнадзора. Оператором направлено уведомление об обработке персональных данных в Федеральную службу по надзору в сфере связи, информационных технологий и массовых коммуникаций (Роскомнадзор) в соответствии с ч. 1 ст. 22 Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» (в редакции Федерального закона от 14.07.2022 № 266-ФЗ). Регистрационный номер будет опубликован в настоящей Политике после его присвоения. В случае изменения сведений, указанных в уведомлении, Оператор обязуется информировать Роскомнадзор в порядке и сроки, установленные ч. 7 ст. 22 152-ФЗ.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">2. ОСНОВНЫЕ ПОНЯТИЯ</h3>
        <p>2.1. Персональные данные (ПДн) — любая информация, относящаяся прямо или косвенно к определенному или определяемому физическому лицу (субъекту персональных данных, Пользователю).</p>
        <p>2.2. Обработка персональных данных — любое действие (операция) или совокупность действий (операций), совершаемых с использованием средств автоматизации или без их использования с персональными данными, включая сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (распространение, предоставление, доступ), обезличивание, блокирование, удаление, уничтожение.</p>
        <p>2.3. Автоматизированная обработка — обработка персональных данных с помощью средств вычислительной техники.</p>
        <p>2.4. Обезличивание персональных данных — действия, в результате которых становится невозможным без использования дополнительной информации определить принадлежность персональных данных конкретному субъекту.</p>
        <p>2.5. Блокирование персональных данных — временное прекращение обработки персональных данных (за исключением случаев, если обработка необходима для уточнения данных).</p>
        <p>2.6. Уничтожение персональных данных — действия, в результате которых становится невозможным восстановить содержание персональных данных в информационной системе и/или в результате которых уничтожаются материальные носители персональных данных.</p>
        <p>2.7. Трансграничная передача персональных данных — передача персональных данных на территорию иностранного государства органу власти иностранного государства, иностранному физическому лицу или иностранному юридическому лицу.</p>
        <p>2.8. Пользователь (Субъект персональных данных) — любое физическое лицо, посещающее Сайт и/или зарегистрированное на Платформе.</p>
        <p>2.9. Сайт (Платформа) — совокупность графических и информационных материалов, программ для ЭВМ и баз данных, обеспечивающих их доступность в сети Интернет по адресу: https://yanush-sim.ru.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">3. КАТЕГОРИИ СУБЪЕКТОВ ПЕРСОНАЛЬНЫХ ДАННЫХ</h3>
        <p>3.1. Оператор обрабатывает персональные данные следующих категорий субъектов:<br/>
        Посетители Сайта: Лица, посещающие Сайт без регистрации. Обрабатываются только технические и cookie-данные.<br/>
        Зарегистрированные Пользователи (Лицензиаты): Лица, прошедшие регистрацию и создавшие Личный кабинет. Обрабатывается полный состав данных.<br/>
        Лица, обращающиеся в поддержку: Лица, направляющие запросы на email поддержки без регистрации.</p>
        <p>3.2. Платформа предназначена исключительно для лиц, достигших возраста 18 (восемнадцати) лет. Оператор не осуществляет сознательный и целенаправленный сбор персональных данных несовершеннолетних. В случае если Оператору станет известно, что персональные данные были предоставлены лицом, не достигшим 18 лет, такие данные будут удалены в кратчайшие сроки, а соответствующий аккаунт — заблокирован. Если вам стало известно о регистрации несовершеннолетнего, просим сообщить на адрес: support@yanush-sim.ru.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">4. ПЕРЕЧЕНЬ ОБРАБАТЫВАЕМЫХ ПЕРСОНАЛЬНЫХ ДАННЫХ</h3>
        <p>4.1. Оператор обрабатывает только те персональные данные, которые необходимы для достижения целей, указанных в разделе 5 настоящей Политики. Оператор не собирает и не обрабатывает специальные категории персональных данных, касающиеся расовой, национальной принадлежности, политических взглядов, религиозных или философских убеждений, состояния здоровья, интимной жизни Пользователя (ст. 10 152-ФЗ), а также биометрические персональные данные (ст. 11 152-ФЗ).</p>
        <p>4.2. Полный перечень обрабатываемых данных:</p>
        <p><strong>4.2.1. Данные, предоставляемые Пользователем при регистрации и использовании Платформы:</strong><br/>
        Данные аутентификации: Адрес электронной почты (email); хеш пароля (пароль в открытом виде не хранится).<br/>
        Данные Личного кабинета: Уникальный идентификатор аккаунта (UUID); дата и время регистрации; текущий тариф; баланс Сессий; история приобретения Пакетов сессий.<br/>
        Текстовый контент Сессий: Реплики (текстовые сообщения), вводимые Пользователем в чат симуляции; результаты Сессий (метрики доверия, стресса, итоговый балл); текст отчетов «Комиссии экспертов» и рекомендаций «Суфлера».<br/>
        Платежные данные: Факт и дата оплаты, сумма, идентификатор транзакции. Полные реквизиты банковской карты (номер, срок, CVV) не обрабатываются и не хранятся Оператором — обработка осуществляется исключительно платежным провайдером.<br/>
        Данные обращений в поддержку: Содержание переписки с поддержкой (email, тема, текст обращения).</p>
        <p><strong>4.2.2. Данные, собираемые автоматически при посещении Сайта:</strong><br/>
        Технические данные: IP-адрес; тип и версия браузера (User-Agent); тип устройства и операционная система; разрешение экрана; язык браузера.<br/>
        Данные об использовании: Дата и время посещения страниц Сайта; URL посещенных страниц; источник перехода (referrer); дата, время, длительность Сессий.<br/>
        Файлы cookie и аналогичные технологии: Подробности — в разделе 9 настоящей Политики.</p>
        <p>4.3. Запрет на ввод персональных данных третьих лиц. Пользователю категорически запрещается вводить в текстовый чат симуляции Платформы персональные данные третьих лиц: реальные фамилии, имена, отчества, контактные данные, медицинские диагнозы, иные сведения, позволяющие идентифицировать конкретных реальных учеников, коллег или иных физических лиц. Платформа предназначена для работы исключительно с вымышленными ролевыми сценариями. Вся ответственность за нарушение данного запрета и, как следствие, за нарушение 152-ФЗ в отношении третьих лиц, возлагается на Пользователя.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">5. ЦЕЛИ И ПРАВОВЫЕ ОСНОВАНИЯ ОБРАБОТКИ</h3>
        <p>5.1. Оператор обрабатывает персональные данные Пользователей для следующих целей и на следующих правовых основаниях:<br/>
        Исполнение Лицензионного договора-оферты: регистрация, создание и ведение Личного кабинета, аутентификация, предоставление доступа к функционалу Платформы, начисление и списание Сессий, обработка оплаты. (Основание: ч. 1 п. 5 ст. 6 152-ФЗ).<br/>
        Генерация контента Сессий: передача текстовых реплик Пользователя Провайдерам LLM API для формирования ответов виртуального собеседника. (Основание: ч. 1 п. 5 ст. 6 и ч. 1 п. 1 ст. 6 152-ФЗ).<br/>
        Обеспечение обратной связи и поддержки: направление транзакционных уведомлений, обработка запросов в поддержку. (Основание: ч. 1 п. 5 ст. 6 152-ФЗ).<br/>
        Маркетинговые коммуникации: направление информации об обновлениях, специальных предложениях. (Основание: ч. 1 п. 1 ст. 6 152-ФЗ — отдельное согласие субъекта).<br/>
        Улучшение Платформы и аналитика: анализ обезличенных данных Сессий для совершенствования алгоритмов, проведения научных исследований. (Основание: ч. 1 п. 1 ст. 6 и ч. 1 п. 7 ст. 6 152-ФЗ).<br/>
        Обеспечение безопасности Платформы: выявление попыток взлома, prompt injection, нарушений Оферты. (Основание: ч. 1 п. 7 ст. 6 152-ФЗ).<br/>
        Исполнение требований законодательства: хранение данных о транзакциях. (Основание: ч. 1 п. 2 ст. 6 152-ФЗ).</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">6. ТРЕТЬИ ЛИЦА — ПОЛУЧАТЕЛИ ПЕРСОНАЛЬНЫХ ДАННЫХ</h3>
        <p>6.1. Для достижения целей обработки Оператор может передавать данные следующим категориям получателей:<br/>
        Провайдер инфраструктуры баз данных (Supabase, Inc.): Email, хеш пароля, UUID аккаунта. (Юрисдикция: США / ЕС. Является трансграничной передачей).<br/>
        Провайдеры LLM API (OpenRouter, ProxyAPI, Claude, Gemini и др.): Текстовые реплики в чате в строго обезличенном виде (без email, IP, UUID). (Юрисдикция: США / ЕС и иные).<br/>
        Платежный провайдер: Минимально необходимые данные для транзакции. (Юрисдикция: РФ).<br/>
        Сервисы веб-аналитики (Яндекс.Метрика): Технические данные, файлы cookie. (Юрисдикция: РФ).<br/>
        Государственные органы РФ: По законному запросу. (Юрисдикция: РФ).</p>
        <p>6.2. Оператор не продает персональные данные Пользователей третьим лицам.</p>
        <p>6.3. Оператор требует от контрагентов соблюдения конфиденциальности и применения надлежащих мер защиты.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">7. ТРАНСГРАНИЧНАЯ ПЕРЕДАЧА ПЕРСОНАЛЬНЫХ ДАННЫХ</h3>
        <p>7.1. В связи с использованием инфраструктуры Supabase (п. 6.1, № 1) персональные данные Пользователя передаются и хранятся на серверах за пределами РФ (США, ЕС). Данная операция является трансграничной передачей персональных данных в смысле ст. 12 152-ФЗ.</p>
        <p>7.2. Данные, передаваемые Провайдерам LLM API. Оператор предпринимает организационные и технические меры для обезличивания текстовых запросов: Оператор не передает email, IP-адрес или идентификатор аккаунта Пользователя. Однако, учитывая вероятностный характер косвенной идентификации по тексту реплик, Оператор квалифицирует данную передачу как потенциально трансграничную и получает на нее согласие Пользователя.</p>
        <p>7.3. Правовое основание трансграничной передачи:<br/>
        а) Согласие субъекта ПДн (при Акцепте Оферты).<br/>
        б) Необходимость исполнения договора (пп. 2 п. 4 ч. 1 ст. 12 152-ФЗ в ред. от 14.07.2022).</p>
        <p>7.4. Оператор обязуется до начала передачи убедиться, что иностранным государством обеспечивается адекватная защита прав субъектов ПДн.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">8. ПРАВА СУБЪЕКТА ПЕРСОНАЛЬНЫХ ДАННЫХ</h3>
        <p>8.1. Пользователь имеет право на: информацию об обработке своих ПДн; доступ к данным; уточнение, блокирование или удаление данных; отзыв согласия; обжалование действий Оператора в Роскомнадзоре или суде.</p>
        <p>8.2. Порядок реализации прав. Запрос направляется на адрес: support@yanush-sim.ru. В запросе указываются: ФИО (при наличии), email регистрации, существо требования.</p>
        <p>8.3. Срок рассмотрения. Оператор направляет ответ в течение 30 (тридцати) календарных дней.</p>
        <p>8.4. Последствия отзыва согласия. Отзыв согласия влечет прекращение обработки ПДн, удаление учетной записи в течение 30 дней и невозможность использования Платформы.</p>
        <p>8.5. Контакт Роскомнадзора: г. Москва, Китайгородский проезд, д. 7, стр. 2; Портал обращений: https://pd.rkn.gov.ru.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">9. ФАЙЛЫ COOKIE И АНАЛОГИЧНЫЕ ТЕХНОЛОГИИ</h3>
        <p>9.1. Платформа использует файлы cookie для обеспечения функционирования Сайта (строго необходимые cookie) и сбора аналитических данных (аналитические cookie Яндекс.Метрики).</p>
        <p>9.2. Пользователь может управлять файлами cookie через настройки браузера или баннер на Сайте. Отключение строго необходимых cookie приведет к невозможности использования Платформы.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">10. СРОКИ ОБРАБОТКИ И ПОРЯДОК УДАЛЕНИЯ ПЕРСОНАЛЬНЫХ ДАННЫХ</h3>
        <p>10.1. Персональные данные хранятся в течение следующих сроков:<br/>
        Данные аутентификации: Срок существования аккаунта + 30 дней после удаления.<br/>
        Данные Личного кабинета (история покупок): Срок существования аккаунта + 3 года после удаления (требования НК РФ).<br/>
        Текстовые реплики чата: 12 месяцев в привязанном к аккаунту виде; далее — бессрочно исключительно в полностью обезличенном (агрегированном) виде.<br/>
        Технические данные (IP, логи): 90 дней.</p>
        <p>10.2. Удаление аккаунта. При удалении учетной записи данные уничтожаются (либо изолируются на срок, требуемый налоговым законодательством). Обезличенные агрегированные данные сохраняются.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">11. МЕРЫ ПО ОБЕСПЕЧЕНИЮ БЕЗОПАСНОСТИ ПЕРСОНАЛЬНЫХ ДАННЫХ</h3>
        <p>11.1. Оператор принимает правовые, организационные и технические меры для защиты персональных данных: шифрование передачи (HTTPS), шифрование паролей (хеширование), защита от SQL-инъекций и XSS, минимизация данных и обезличивание перед отправкой к Провайдерам LLM API.</p>
        <p>11.2. Реагирование на инциденты (утечки). В случае выявления инцидента безопасности Оператор обязуется уведомить Роскомнадзор в течение 24 часов и затронутых Пользователей не позднее 72 часов с описанием принятых мер (в порядке ч. 3.1 ст. 21 152-ФЗ).</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">12. ПОРЯДОК ВНЕСЕНИЯ ИЗМЕНЕНИЙ В ПОЛИТИКУ</h3>
        <p>12.1. Оператор вправе вносить изменения в настоящую Политику. Новая редакция вступает в силу по истечении 10 (десяти) календарных дней с момента ее размещения по адресу: https://yanush-sim.ru/privacy.</p>
        <p>12.2. Оператор уведомляет Пользователей о существенных изменениях по электронной почте не позднее дня размещения новой редакции.</p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">13. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ</h3>
        <p>13.1. Пользователь может получить любые разъяснения по вопросам обработки его персональных данных по email: support@yanush-sim.ru.</p>
        <p>13.2. Настоящая Политика действует бессрочно до ее замены новой редакцией.</p>
        <p>13.3. В случае противоречия между настоящей Политикой и Офертой в вопросах обработки персональных данных приоритет имеет настоящая Политика как специальный документ.</p>
      </div>
    )
  },
  {
    id: 'contacts',
    title: 'Контакты',
    icon: <Mail size={18} />,
    content: (
      <div className="space-y-4 text-slate-400">
        <h2 className="text-xl font-bold text-white">Связаться с нами</h2>
        <p>По вопросам сотрудничества и технической поддержки:</p>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-white/5">
          <p className="text-white">Email: yanush.trainer@gmail.com</p>
          <p className="text-slate-500 text-sm mt-1">Отвечаем в течение 24 часов</p>
        </div>
      </div>
    )
  }
];

export default function DocumentsModal({ isOpen, onClose, initialDocId = 'guide' }: DocumentsModalProps) {
  const [activeDocId, setActiveDocId] = React.useState(initialDocId);

  const handleDocChange = (id: string) => {
    setActiveDocId(id);
    // Даем React время обновить DOM перед скроллом
    setTimeout(() => {
      const c = document.getElementById('docs-scroll-container');
      if (c) c.scrollTo(0, 0);
      window.scrollTo(0, 0);
    }, 0);
  };

  // Синхронизация activeDocId с initialDocId при открытии
  React.useEffect(() => {
    if (isOpen) {
      setActiveDocId(initialDocId);
    }
  }, [isOpen, initialDocId]);

  if (!isOpen) return null;

  const DOCUMENTS = getDocuments(handleDocChange);
  const activeDoc = DOCUMENTS.find(d => d.id === activeDocId) || DOCUMENTS[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-8">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl max-h-[95dvh] md:h-[85vh] bg-[#0d1117] rounded-3xl md:rounded-[40px] border border-white/10 shadow-2xl flex flex-col md:flex-row">
        {/* Сайдбар — на мобильных горизонтальный скролл */}
        <div className="shrink-0 w-full md:w-80 bg-slate-900/50 border-b md:border-b-0 md:border-r border-white/5 p-3 md:p-6 md:space-y-2 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden">
          <div className="hidden md:block mb-8 px-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Документация</div>
          <div className="flex md:flex-col gap-2 min-w-max md:min-w-0">
            {DOCUMENTS.map(doc => (
              <button
                key={doc.id}
                onClick={() => handleDocChange(doc.id)}
                className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl text-left transition-all whitespace-nowrap md:whitespace-normal md:w-full ${
                  activeDocId === doc.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                {doc.icon}
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider leading-tight">{doc.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Контентная часть */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="shrink-0 h-12 md:h-16 flex items-center justify-between px-4 md:px-8 border-b border-white/5">
            <span className="text-[9px] md:text-[10px] font-mono text-slate-500 uppercase tracking-widest italic">Doc_ID: {activeDoc.id}.pdf</span>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div 
            id="docs-scroll-container"
            className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-12 touch-scroll"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="max-w-2xl mx-auto pb-10">
              {activeDoc.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

