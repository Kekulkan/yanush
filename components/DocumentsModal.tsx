import React from 'react';
import { X, BookOpen, FileText, Shield, Mail, HelpCircle, Zap, MessageSquare, Target, Award, AlertTriangle } from 'lucide-react';

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

const DOCUMENTS: Document[] = [
  {
    id: 'guide',
    title: 'Руководство пользователя',
    icon: <HelpCircle size={18} />,
    content: (
      <div className="space-y-8 text-slate-300 leading-relaxed pb-20">
        <header className="border-b border-slate-700 pb-6">
          <h2 className="text-2xl font-black text-white uppercase italic">
            Руководство по использованию тренажёра «Януш»
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
            <li><strong>Прочитайте вводную:</strong> перед началом диалога вы увидите описание ситуации и «досье» ученика</li>
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
              <p className="text-blue-300 italic mt-2">«Я вижу, что тебе сейчас непросто. Хочешь поговорить?»</p>
            </div>
            
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <p className="font-bold text-white mb-2">✨ Действия</p>
              <p className="text-slate-400">Используйте <strong>*звёздочки*</strong> для описания действий:</p>
              <p className="text-blue-300 italic mt-2">«*Присаживаюсь рядом, но на расстоянии* Не против, если я тут посижу?»</p>
            </div>
            
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <p className="font-bold text-white mb-2">🎤 Голосовой ввод</p>
              <p className="text-slate-400">Нажмите на иконку микрофона, чтобы диктовать реплики голосом.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4 flex items-center gap-2">
            <Award size={20} /> Как оценивается?
          </h3>
          <p>После завершения сессии ваши действия оценивает <strong>комиссия экспертов</strong>:</p>
          
          <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
            <p className="font-bold text-emerald-400 mb-2">Основная комиссия</p>
            <p className="text-slate-400">6-8 профессионалов (психологи, педагоги, криминологи). Их оценки формируют итоговый балл.</p>
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
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4 flex items-center gap-2">
            <AlertTriangle size={20} /> Чего избегать?
          </h3>
          <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
            <ul className="space-y-2 text-slate-300">
              <li>❌ <strong>Угрозы и шантаж</strong> — «Если не успокоишься, вызову родителей»</li>
              <li>❌ <strong>Морализаторство</strong> — «Ты должен понимать, что так нельзя»</li>
              <li>❌ <strong>Обесценивание</strong> — «Это всё ерунда, бывает и хуже»</li>
              <li>❌ <strong>Шаблонные фразы</strong> — подростки мгновенно чувствуют фальшь</li>
              <li>❌ <strong>Перебивание</strong> — дайте ученику договорить</li>
              <li>❌ <strong>Игнорирование состояния</strong> — следите за индикаторами стресса</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-white uppercase tracking-tight">Полезные советы</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <p className="font-bold text-blue-400 mb-2">👁️ Следите за индикаторами</p>
              <p className="text-slate-400 text-sm">Доверие (зелёный) и Стресс (красный) показывают состояние ученика в реальном времени.</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <p className="font-bold text-blue-400 mb-2">🎯 Читайте «мысли»</p>
              <p className="text-slate-400 text-sm">Администраторы видят внутренние мысли ученика — это помогает понять, что он на самом деле чувствует.</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <p className="font-bold text-blue-400 mb-2">📚 Изучите акцентуации</p>
              <p className="text-slate-400 text-sm">В «Экспозиции» есть демо-режимы для каждого психотипа — посмотрите, как с ними работать.</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <p className="font-bold text-blue-400 mb-2">💡 Используйте суфлёра</p>
              <p className="text-slate-400 text-sm">Кнопка «Суфлёр» подскажет, что сказать в сложной ситуации (для админов).</p>
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
    id: 'methodology',
    title: 'Методологическое обоснование супервизии',
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
            <li>Маргарита Львовна оценивает как «недостаточное контейнирование аффекта»</li>
            <li>Валентина Фёдоровна — как «правильную твёрдость»</li>
            <li>Опир Упалнамоченов — как «несообщение о правонарушении»</li>
            <li>Тимоха — как «ну норм, не орал хотя бы»</li>
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
          <p>Функция «онлайн-комментирования» — когда пользователь видит, как второй пул в реальном времени реагирует на его реплики — усиливает этот эффект. Это создаёт ироническую дистанцию: «я делаю своё дело, а они пусть говорят».</p>

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
            На фоне Опира Упалнамоченова и Снежаны Световзор разница между позицией Маргариты Львовны (психоаналитик) и Дмитрия Сергеевича (когнитивно-поведенческий подход) становится осмысленной дискуссией внутри профессионального поля, а не «кто из них прав».
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

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4">
            VII. Функция режима «онлайн-комментирования»
          </h3>
          <h4 className="font-bold text-white">7.1. Описание</h4>
          <p>Пользователь может не только получить итоговую оценку, но и просмотреть стенограмму того, как члены второго пула в режиме реального времени реагировали на каждую его реплики: возмущались, аплодировали, требовали «записать», угрожали жалобой, восхищались или ужасались.</p>

          <h4 className="font-bold text-white">7.2. Педагогический смысл</h4>
          <p>Этот режим создаёт:</p>
          <p>
            <strong>Мета-позицию наблюдателя.</strong> Пользователь видит свой диалог «со стороны», глазами разных (включая абсурдных) наблюдателей. Это развивает рефлексивность и децентрацию.
          </p>
          <p>
            <strong>Осознание публичности профессии.</strong> Педагог работает «на сцене»: его видят, оценивают, интерпретируют. Режим онлайн-комментирования делает эту публичность ощутимой — и позволяет к ней подготовиться.
          </p>
          <p>
            <strong>Тренировку эмоциональной устойчивости.</strong> Видеть, как Людмила Аркадьевна в реальном времени пишет «ЭТО ТРАВМА!!!» — и продолжать делать своё дело — это навык.
          </p>
          <p>
            <strong>Материал для последующей рефлексии.</strong> Пользователь может вернуться к стенограмме и проанализировать: в какие моменты какие «голоса» активизировались? Что это говорит о ситуации? Что — о «голосах»?
          </p>

          <h4 className="font-bold text-white">7.3. Теоретическое основание</h4>
          <p>
            Концепция «обучения через наблюдение» (Bandura, 1986) и практика «дебрифинга» в симуляционном обучении (Fanning & Gaba, 2007) предполагают, что ключевой обучающий момент — не само действие, а его последующий анализ с разных точек зрения. Режим онлайн-комментирования предоставляет богатый материал для такого анализа.
          </p>
        </section>

        <section className="space-y-6">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4">
            VIII. Ответ на возможные возражения
          </h3>
          <div className="space-y-4">
            <p><strong>8.1. «Это несерьёзно и превращает симулятор в развлечение»</strong></p>
            <p>Юмор и серьёзность не противоположны. Сатира — древнейший инструмент критического осмысления реальности. Комедия Аристофана, сатиры Салтыкова-Щедрина, театр абсурда — всё это «несерьёзно» по форме и глубоко серьёзно по содержанию.</p>
            <p>Кроме того, «развлечение» — легитимный педагогический приём. Вовлечённость пользователя — условие эффективного обучения. Если второй пул делает симулятор более увлекательным — это повышает, а не снижает его образовательную ценность.</p>

            <p><strong>8.2. «Это формирует цинизм по отношению к обратной связи»</strong></p>
            <p>Напротив. Цинизм формируется, когда человек не имеет инструментов для различения осмысленной и бессмысленной критики — и отвергает всё подряд. Симулятор учит различать: первый пул — принимай всерьёз, второй — распознавай и дистанцируйся.</p>

            <p><strong>8.3. «Это оскорбляет реальных людей (верующих, полицейских, чиновников, родителей)»</strong></p>
            <p>Персонажи второго пула — не изображения социальных групп, а архетипы дисфункционального поведения внутри этих групп. Отец Онуфрий — не «типичный священник», а патологический случай. Опир Упалнамоченов — не «типичный полицейский», а коррумпированный садист.</p>
            <p>Более того: сами представители этих групп, если они профессиональны и адекватны, заинтересованы в маркировании патологии внутри своего сообщества.</p>

            <p><strong>8.4. «Это политически ангажировано»</strong></p>
            <p>Симулятор не предписывает пользователю политических взглядов. Он показывает, что любая идеологическая одержимость — левая, правая, религиозная, атеистическая — искажает профессиональную оценку. Если в текущей версии больше персонажей, представляющих консервативно-государственническую идеологию — это отражает реальный баланс давления, с которым сталкивается российский учитель в 2025 году. При изменении контекста состав может быть скорректирован.</p>
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-xl font-bold text-blue-400 uppercase tracking-tight border-l-4 border-blue-500 pl-4">
            IX. Заключение
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
                <tr>
                  <td className="p-3 border border-slate-700">Рефлексивный материал</td>
                  <td className="p-3 border border-slate-700">Стенограмма онлайн-комментирования</td>
                  <td className="p-3 border border-slate-700">Глубокий разбор ситуации постфактум</td>
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
      <div className="space-y-4 text-slate-400">
        <h2 className="text-xl font-bold text-white">Публичная оферта</h2>
        <p>Текст договора и условий использования сервиса находится в разработке...</p>
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
          <p className="text-white">Email: support@yanush-sim.ru</p>
          <p className="text-slate-500 text-sm mt-1">Отвечаем в течение 24 часов</p>
        </div>
      </div>
    )
  }
];

export default function DocumentsModal({ isOpen, onClose, initialDocId = 'methodology' }: DocumentsModalProps) {
  const [activeDocId, setActiveDocId] = React.useState(initialDocId);

  if (!isOpen) return null;

  const activeDoc = DOCUMENTS.find(d => d.id === activeDocId) || DOCUMENTS[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl h-[85vh] bg-[#0d1117] rounded-[40px] border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Сайдбар со списком документов */}
        <div className="w-full md:w-80 bg-slate-900/50 border-b md:border-b-0 md:border-r border-white/5 p-6 space-y-2 overflow-y-auto">
          <div className="mb-8 px-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Юридический архив</div>
          {DOCUMENTS.map(doc => (
            <button
              key={doc.id}
              onClick={() => setActiveDocId(doc.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all ${
                activeDocId === doc.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              {doc.icon}
              <span className="text-xs font-bold uppercase tracking-wider leading-tight">{doc.title}</span>
            </button>
          ))}
        </div>

        {/* Контентная часть */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-16 flex items-center justify-between px-8 border-b border-white/5">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest italic">Doc_ID: {activeDoc.id}.pdf</span>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
            <div className="max-w-2xl mx-auto">
              {activeDoc.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
