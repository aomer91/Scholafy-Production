
import { Question } from '../types';
import { supabase } from '../lib/supabase';

// Demo ID
const DEMO_PROFILE_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Publishes the current learning state to Supabase.
 * This allows the parent dashboard to monitor progress in real-time.
 */
export const publishLiveStatus = async (lessonId: string, payload: any, signal?: AbortSignal) => {
  if (!lessonId) return;

  try {
    let query = supabase
      .from('live_sessions')
      .upsert({
        profile_id: DEMO_PROFILE_ID,
        lesson_id: lessonId,
        mode: payload.mode,
        t: payload.t || 0,
        total: payload.total || 0,
        q_text: payload.qText || null,
        stats: payload.stats || {},
        history: payload.history || [],
        last_update: new Date().toISOString()
      }, { onConflict: 'profile_id' });

    if (signal) {
      query = query.abortSignal(signal);
    }

    const { error } = await query;

    if (error) {
      // Force stringification to reveal the actual DB error
      console.error("Live Sync Error (Supabase):", JSON.stringify(error, null, 2));
    }
  } catch (e: any) {
    // Handle network or code errors
    if (e.name === 'AbortError') return; // Ignore aborts
    console.error("Live Sync Exception:", e?.message || JSON.stringify(e));
  }
};

/**
 * Deletes the live session row from Supabase.
 */
export const deleteLiveStatus = async () => {
  try {
    const { error } = await supabase
      .from('live_sessions')
      .delete()
      .eq('profile_id', DEMO_PROFILE_ID);

    if (error) {
      console.error("Error deleting live status:", error);
    }
  } catch (e) {
    console.error("Exception deleting live status:", e);
  }
};

export const renderQuestion = (
  container: HTMLElement,
  question: Question,
  onAnswer: (isCorrect: boolean, answer: string | string[]) => void
) => {
  try {
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col w-full animate-in fade-in slide-in-from-bottom-4 duration-500';

    const prompt = document.createElement('h2');
    prompt.className = 'text-xl md:text-2xl font-semibold text-center mb-6 text-white leading-relaxed';
    prompt.innerHTML = question.prompt;
    wrapper.appendChild(prompt);

    if (question.image) {
      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'flex justify-center mb-6';
      const img = document.createElement('img');
      img.src = question.image;
      img.className = 'max-w-full max-h-40 md:max-h-60 rounded-xl border border-scholafy-border shadow-lg';
      imgWrapper.appendChild(img);
      wrapper.appendChild(imgWrapper);
    }

    const interactionArea = document.createElement('div');
    interactionArea.className = 'w-full mb-6';
    wrapper.appendChild(interactionArea);

    const feedback = document.createElement('div');
    feedback.className = 'hidden mb-6 p-4 rounded-xl text-center font-bold text-lg border transform transition-all duration-300 scale-95 opacity-0';
    wrapper.appendChild(feedback);

    const btnRow = document.createElement('div');
    btnRow.className = 'flex justify-center mt-4';
    const checkBtn = document.createElement('button');
    checkBtn.className = 'bg-scholafy-accent text-scholafy-panel px-12 py-4 rounded-xl font-bold text-xl hover:bg-yellow-400 hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none shadow-lg shadow-yellow-500/20';
    checkBtn.textContent = 'Check Answer';
    checkBtn.disabled = true;
    btnRow.appendChild(checkBtn);
    wrapper.appendChild(btnRow);

    container.appendChild(wrapper);

    // Question logic (Choice/Cloze/Match)
    if (question.type === 'choice') {
      const options = question.options || [];
      const optionEls: HTMLElement[] = [];
      let selectedIndex = -1;

      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-1 gap-4';

      options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left p-5 rounded-xl border-2 border-scholafy-border bg-scholafy-card text-scholafy-muted transition-all text-lg font-medium flex items-center group hover:bg-white/5';

        const marker = document.createElement('span');
        marker.className = 'w-8 h-8 rounded-full border-2 border-scholafy-muted mr-4 flex-shrink-0 flex items-center justify-center text-sm font-bold group-hover:border-white group-hover:text-white transition-colors';
        marker.textContent = String.fromCharCode(65 + idx);
        btn.appendChild(marker);

        const label = document.createElement('span');
        label.textContent = opt.label;
        btn.appendChild(label);

        btn.onclick = () => {
          if (checkBtn.textContent === 'Correct' || checkBtn.textContent === 'Incorrect') return;

          optionEls.forEach((el, i) => {
            el.className = 'w-full text-left p-5 rounded-xl border-2 border-scholafy-border bg-scholafy-card text-scholafy-muted transition-all text-lg font-medium flex items-center group hover:bg-white/5';
            const m = el.querySelector('span');
            if (m) {
              m.className = 'w-8 h-8 rounded-full border-2 border-scholafy-muted mr-4 flex-shrink-0 flex items-center justify-center text-sm font-bold group-hover:border-white group-hover:text-white transition-colors';
              m.textContent = String.fromCharCode(65 + i);
            }
          });

          btn.className = 'w-full text-left p-5 rounded-xl border-2 border-scholafy-accent bg-scholafy-accent/10 text-white shadow-lg transition-all text-lg font-medium flex items-center';
          marker.className = 'w-8 h-8 rounded-full bg-scholafy-accent border-2 border-scholafy-accent mr-4 flex-shrink-0 flex items-center justify-center text-sm font-bold text-scholafy-panel';
          marker.textContent = '✓';

          selectedIndex = idx;
          checkBtn.disabled = false;
          feedback.classList.add('hidden');
        };

        grid.appendChild(btn);
        optionEls.push(btn);
      });
      interactionArea.appendChild(grid);

      checkBtn.onclick = () => {
        if (checkBtn.disabled && (checkBtn.textContent === 'Correct' || checkBtn.textContent === 'Incorrect')) return;

        const isCorrect = options[selectedIndex].correct;
        const answer = options[selectedIndex].label;
        showFeedback(feedback, isCorrect, options[selectedIndex].feedbackCorrect, options[selectedIndex].feedbackWrong);

        checkBtn.disabled = true;
        if (isCorrect) {
          checkBtn.textContent = 'Correct';
          optionEls[selectedIndex].classList.remove('border-scholafy-accent', 'bg-scholafy-accent/10');
          optionEls[selectedIndex].classList.add('border-green-500', 'bg-green-500/20');
        } else {
          checkBtn.textContent = 'Incorrect';
          optionEls[selectedIndex].classList.add('shake', 'border-red-500');
          setTimeout(() => optionEls[selectedIndex].classList.remove('shake'), 500);
        }
        onAnswer(isCorrect, answer);
      };
    } else if (question.type === 'cloze' && question.clozeText) {
      const text = question.clozeText;
      const parts = text.split(/\[(.*?)\]/g);
      const inputs: HTMLInputElement[] = [];
      const answers: string[] = [];

      const sentenceContainer = document.createElement('div');
      sentenceContainer.className = "text-lg md:text-2xl leading-loose text-center font-medium";

      parts.forEach((part, i) => {
        if (i % 2 === 0) {
          const span = document.createElement('span');
          span.textContent = part;
          sentenceContainer.appendChild(span);
        } else {
          answers.push(part.toLowerCase().trim());
          const input = document.createElement('input');
          input.type = "text";
          input.className = "bg-scholafy-navy border-b-2 border-scholafy-muted text-scholafy-accent text-center w-24 md:w-32 mx-1 focus:outline-none focus:border-scholafy-accent transition-colors";
          input.oninput = () => {
            checkBtn.disabled = inputs.some(inp => inp.value.trim() === '');
            feedback.classList.add('hidden');
          };
          inputs.push(input);
          sentenceContainer.appendChild(input);
        }
      });
      interactionArea.appendChild(sentenceContainer);

      checkBtn.onclick = () => {
        if (checkBtn.disabled && (checkBtn.textContent === 'Correct' || checkBtn.textContent === 'Incorrect')) return;

        let correctCount = 0;
        const submittedAnswers = inputs.map(inp => inp.value.trim());
        inputs.forEach((inp, idx) => {
          if (inp.value.toLowerCase().trim() === answers[idx]) {
            correctCount++;
            inp.classList.add('border-green-500', 'text-green-500');
          } else {
            inp.classList.add('border-red-500', 'text-red-500', 'shake');
            setTimeout(() => inp.classList.remove('shake'), 500);
          }
        });

        const isCorrect = correctCount === answers.length;
        showFeedback(feedback, isCorrect);
        checkBtn.disabled = true;
        checkBtn.textContent = isCorrect ? 'Correct' : 'Incorrect';
        onAnswer(isCorrect, submittedAnswers);
      };

    } else if (question.type === 'multi-choice') {
      const options = question.options || [];
      const optionEls: HTMLElement[] = [];
      const selectedIndices = new Set<number>();

      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

      options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left p-5 rounded-xl border-2 border-scholafy-border bg-scholafy-card text-scholafy-muted transition-all text-lg font-medium flex items-center gap-3 hover:bg-white/5';

        const checkbox = document.createElement('div');
        checkbox.className = 'w-6 h-6 rounded border-2 border-scholafy-muted flex items-center justify-center transition-colors';
        btn.appendChild(checkbox);

        const label = document.createElement('span');
        label.textContent = opt.label;
        btn.appendChild(label);

        btn.onclick = () => {
          if (checkBtn.textContent === 'Correct' || checkBtn.textContent === 'Incorrect') return;

          if (selectedIndices.has(idx)) {
            selectedIndices.delete(idx);
            btn.classList.remove('border-scholafy-accent', 'bg-scholafy-accent/10', 'text-white');
            btn.classList.add('border-scholafy-border', 'text-scholafy-muted');
            checkbox.classList.remove('bg-scholafy-accent', 'border-scholafy-accent');
            checkbox.innerHTML = '';
          } else {
            selectedIndices.add(idx);
            btn.classList.add('border-scholafy-accent', 'bg-scholafy-accent/10', 'text-white');
            btn.classList.remove('border-scholafy-border', 'text-scholafy-muted');
            checkbox.classList.add('bg-scholafy-accent', 'border-scholafy-accent');
            checkbox.innerHTML = '✓';
          }

          checkBtn.disabled = selectedIndices.size === 0;
          feedback.classList.add('hidden');
        };

        grid.appendChild(btn);
        optionEls.push(btn);
      });
      interactionArea.appendChild(grid);

      checkBtn.onclick = () => {
        if (checkBtn.disabled && (checkBtn.textContent === 'Correct' || checkBtn.textContent === 'Incorrect')) return;

        // Verify: All correct options must be selected, AND no incorrect options selected
        const correctIndices = options.map((o, i) => o.correct ? i : -1).filter(i => i !== -1);
        const selectedArray = Array.from(selectedIndices);

        const missedCorrect = correctIndices.filter(i => !selectedIndices.has(i));
        const selectedWrong = selectedArray.filter(i => !options[i].correct);

        const isCorrect = missedCorrect.length === 0 && selectedWrong.length === 0;
        const answer = selectedArray.map(i => options[i].label);

        showFeedback(feedback, isCorrect);

        checkBtn.disabled = true;
        if (isCorrect) {
          checkBtn.textContent = 'Correct';
          selectedArray.forEach(i => {
            optionEls[i].classList.remove('border-scholafy-accent', 'bg-scholafy-accent/10');
            optionEls[i].classList.add('border-green-500', 'bg-green-500/20');
          });
        } else {
          checkBtn.textContent = 'Incorrect';
          selectedArray.forEach(i => {
            optionEls[i].classList.add('shake');
            if (!options[i].correct) optionEls[i].classList.add('border-red-500');
          });
          setTimeout(() => optionEls.forEach(el => el.classList.remove('shake')), 500);
        }
        onAnswer(isCorrect, answer);
      };

    } else if (question.type === 'order' && question.items) {
      const originalItems = [...question.items].sort(() => Math.random() - 0.5); // Shuffle initially
      const userOrder: string[] = []; // Array of IDs

      const orderContainer = document.createElement('div');
      orderContainer.className = "flex flex-col gap-6";

      // Drop Zone
      const dropZone = document.createElement('div');
      dropZone.className = "min-h-[80px] p-4 rounded-xl border-2 border-dashed border-white/20 bg-black/20 flex flex-wrap gap-3 items-center justify-center transition-colors";
      dropZone.innerHTML = '<span class="text-scholafy-muted text-sm italic pointer-events-none">Tap items below to add them here in order</span>';

      // Source Zone
      const sourceZone = document.createElement('div');
      sourceZone.className = "flex flex-wrap gap-3 justify-center";

      const itemEls: Map<string, HTMLElement> = new Map();

      const updateUI = () => {
        dropZone.innerHTML = '';
        sourceZone.innerHTML = '';

        if (userOrder.length === 0) {
          dropZone.innerHTML = '<span class="text-scholafy-muted text-sm italic pointer-events-none">Tap items below to add them here in order</span>';
        }

        // Render Dropped Items
        userOrder.forEach(id => {
          const item = question.items?.find(i => i.id === id);
          if (!item) return;
          const el = createOrderBadge(item.content, true, () => {
            // Click to remove (return to source)
            if (checkBtn.textContent === 'Correct' || checkBtn.textContent === 'Incorrect') return;
            const idx = userOrder.indexOf(id);
            if (idx > -1) userOrder.splice(idx, 1);
            updateUI();
          });
          dropZone.appendChild(el);
        });

        // Render Source Items
        originalItems.forEach(item => {
          if (userOrder.includes(item.id)) return; // Already dropped
          const el = createOrderBadge(item.content, false, () => {
            if (checkBtn.textContent === 'Correct' || checkBtn.textContent === 'Incorrect') return;
            userOrder.push(item.id);
            updateUI();
          });
          sourceZone.appendChild(el);
        });

        checkBtn.disabled = userOrder.length !== question.items!.length;
        feedback.classList.add('hidden');
      };

      const createOrderBadge = (text: string, isDropped: boolean, onClick: () => void) => {
        const btn = document.createElement('button');
        const baseClass = "px-6 py-3 rounded-full font-bold shadow-lg transform transition-all hover:scale-105 active:scale-95";
        btn.className = isDropped
          ? `${baseClass} bg-scholafy-accent text-scholafy-panel border-2 border-scholafy-accent`
          : `${baseClass} bg-scholafy-card border-2 border-white/10 hover:border-white/30`;
        btn.textContent = text;
        btn.onclick = onClick;
        return btn;
      };

      updateUI();

      orderContainer.appendChild(dropZone);
      orderContainer.appendChild(sourceZone);
      interactionArea.appendChild(orderContainer);

      checkBtn.textContent = "Check Order";
      checkBtn.onclick = () => {
        if (checkBtn.disabled && (checkBtn.textContent === 'Correct' || checkBtn.textContent === 'Incorrect')) return;

        const isCorrect = userOrder.every((id, i) => id === question.correctOrder![i]);
        const answer = userOrder.map(id => question.items!.find(i => i.id === id)!.content);

        showFeedback(feedback, isCorrect);

        checkBtn.disabled = true;
        checkBtn.textContent = isCorrect ? 'Correct' : 'Incorrect';

        if (isCorrect) {
          dropZone.className = "min-h-[80px] p-4 rounded-xl border-2 border-green-500 bg-green-500/10 flex flex-wrap gap-3 items-center justify-center";
        } else {
          dropZone.classList.add('border-red-500', 'shake');
          setTimeout(() => dropZone.classList.remove('shake'), 500);
        }

        onAnswer(isCorrect, answer);
      };

    } else if (question.type === 'match' && question.pairs) {
      const leftItems = question.pairs.map(p => ({ val: p.left, img: p.leftImage, id: Math.random().toString() }));
      const rightItems = question.pairs.map(p => ({ val: p.right, img: p.rightImage, id: Math.random().toString() }));
      rightItems.sort(() => Math.random() - 0.5);

      const matchWrapper = document.createElement('div');
      matchWrapper.className = "relative w-full select-none"; // Important for drag

      // SVG Layer
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "absolute top-0 left-0 w-full h-full pointer-events-none z-10");

      // Content Layer
      const matchContainer = document.createElement('div');
      matchContainer.className = "flex justify-between gap-12 md:gap-24 relative z-20"; // Gap for lines

      const colLeft = document.createElement('div');
      colLeft.className = "flex flex-col gap-6 flex-1";
      const colRight = document.createElement('div');
      colRight.className = "flex flex-col gap-6 flex-1";

      const leftEls: HTMLElement[] = [];
      const rightEls: HTMLElement[] = [];
      const connections: { leftIndex: number, rightIndex: number, line: SVGElement }[] = [];

      let activeLine: SVGElement | null = null;
      let startPoint: { x: number, y: number } | null = null;
      let activeSide: 'left' | 'right' | null = null;
      let activeIndex: number | null = null;

      const getCenter = (el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        const containerRect = matchWrapper.getBoundingClientRect();
        return {
          x: (rect.left + rect.width / 2) - containerRect.left,
          y: (rect.top + rect.height / 2) - containerRect.top
        };
      };

      const createLine = (x1: number, y1: number, x2: number, y2: number, isTemp = false) => {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(x1));
        line.setAttribute("y1", String(y1));
        line.setAttribute("x2", String(x2));
        line.setAttribute("y2", String(y2));
        line.setAttribute("stroke", isTemp ? "#3b82f6" : "#60a5fa"); // Blue
        line.setAttribute("stroke-width", "4");
        line.setAttribute("stroke-linecap", "round");
        if (isTemp) line.setAttribute("stroke-dasharray", "5,5");
        return line;
      };

      const createNode = (text: string, img: string | undefined, isLeft: boolean, index: number) => {
        const btn = document.createElement('div'); // Div now, not button
        btn.className = `w-full p-4 rounded-xl border-2 border-white/10 bg-scholafy-card transition-all flex items-center justify-between cursor-pointer hover:border-blue-500/50 relative group ${isLeft ? 'flex-row' : 'flex-row-reverse'}`;

        // Anchor visual
        const anchor = document.createElement('div');
        anchor.className = `w-4 h-4 rounded-full bg-scholafy-muted border-2 border-scholafy-card absolute top-1/2 transform -translate-y-1/2 group-hover:scale-125 transition-transform ${isLeft ? '-right-2 bg-blue-500' : '-left-2 bg-blue-500'}`;
        btn.appendChild(anchor);

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.className = `flex items-center gap-3 w-full ${isLeft ? '' : 'justify-end'}`;

        if (img) {
          const image = document.createElement('img');
          image.src = img;
          image.className = "w-12 h-12 object-contain rounded bg-white/5 p-1";
          contentDiv.appendChild(image);
        }
        const span = document.createElement('span');
        span.textContent = text;
        span.className = "font-bold text-sm md:text-base";
        contentDiv.appendChild(span);

        btn.appendChild(contentDiv);

        // Interaction
        btn.onmousedown = (e) => {
          if (checkBtn.textContent === 'Correct' || checkBtn.textContent === 'Incorrect') return;

          e.preventDefault();
          activeSide = isLeft ? 'left' : 'right';
          activeIndex = index;
          const center = getCenter(anchor);
          startPoint = center;

          // Remove existing connection starting from this node
          const existingIdx = isLeft
            ? connections.findIndex(c => c.leftIndex === index)
            : connections.findIndex(c => c.rightIndex === index);

          if (existingIdx > -1) {
            svg.removeChild(connections[existingIdx].line);
            connections.splice(existingIdx, 1);
          }

          activeLine = createLine(center.x, center.y, center.x, center.y, true);
          svg.appendChild(activeLine);
        };

        // Complete Connection
        btn.onmouseup = () => {
          if (activeSide !== null && activeIndex !== null && activeLine && startPoint) {
            // Must be opposite side
            const isOpposite = (activeSide === 'left' && !isLeft) || (activeSide === 'right' && isLeft);

            if (isOpposite) {
              const end = getCenter(anchor);
              svg.removeChild(activeLine);
              activeLine = null;

              const leftIdx = isLeft ? index : activeIndex;
              const rightIdx = isLeft ? activeIndex : index;

              // Remove any existing connection for the target node to maintain 1-to-1
              const existingTargetIdx = isLeft
                ? connections.findIndex(c => c.leftIndex === index)
                : connections.findIndex(c => c.rightIndex === index);

              if (existingTargetIdx > -1) {
                svg.removeChild(connections[existingTargetIdx].line);
                connections.splice(existingTargetIdx, 1);
              }

              const newLine = createLine(startPoint.x, startPoint.y, end.x, end.y);
              svg.appendChild(newLine);
              connections.push({ leftIndex: leftIdx, rightIndex: rightIdx, line: newLine });

              activeSide = null;
              activeIndex = null;
              startPoint = null;
              checkBtn.disabled = connections.length !== question.pairs!.length;
            }
          }
        };

        // Touch support
        btn.ontouchstart = (e) => {
          if (checkBtn.textContent === 'Correct' || checkBtn.textContent === 'Incorrect') return;
          activeSide = isLeft ? 'left' : 'right';
          activeIndex = index;
          const center = getCenter(anchor);
          startPoint = center;

          const existingIdx = isLeft
            ? connections.findIndex(c => c.leftIndex === index)
            : connections.findIndex(c => c.rightIndex === index);

          if (existingIdx > -1) {
            svg.removeChild(connections[existingIdx].line);
            connections.splice(existingIdx, 1);
          }

          activeLine = createLine(center.x, center.y, center.x, center.y, true);
          svg.appendChild(activeLine);
        }

        btn.ontouchend = (e) => {
          // Touch end logic is tricky because e.target might be different. 
          // Usually handled by elementFromPoint in ontouchmove or global touch end.
          // For simplicity, mouse events cover most desktop/laptop use cases.
          if (activeLine) {
            svg.removeChild(activeLine);
            activeLine = null;
            activeSide = null;
            activeIndex = null;
            startPoint = null;
          }
        }

        return { el: btn, anchor };
      };

      // Render Left
      leftItems.forEach((item, idx) => {
        const { el } = createNode(item.val, item.img, true, idx);
        leftEls.push(el);
        colLeft.appendChild(el);
      });

      // Render Right
      rightItems.forEach((item, idx) => {
        const { el } = createNode(item.val, item.img, false, idx);
        rightEls.push(el);
        colRight.appendChild(el);
      });

      // Global Mouse Move / Up
      matchWrapper.onmousemove = (e) => {
        if (activeLine && startPoint) {
          const rect = matchWrapper.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          activeLine.setAttribute("x2", String(x));
          activeLine.setAttribute("y2", String(y));
        }
      };

      matchWrapper.onmouseup = () => {
        if (activeLine) {
          svg.removeChild(activeLine); // Drop invalid
          activeLine = null;
          activeSide = null;
          activeIndex = null;
          startPoint = null;
        }
      };

      matchWrapper.onmouseleave = matchWrapper.onmouseup;

      matchContainer.appendChild(colLeft);
      matchContainer.appendChild(colRight);
      matchWrapper.appendChild(svg); // SVG on top of background but below content? 
      // SVG z-index is 10, content is 20. But SVG needs to be visible.
      // Actually, SVG pointer-events: none is key.
      matchWrapper.appendChild(matchContainer);
      interactionArea.appendChild(matchWrapper);

      checkBtn.textContent = "Finish Matching";
      checkBtn.disabled = true;
      checkBtn.onclick = () => {
        if (checkBtn.disabled && (checkBtn.textContent === 'Correct' || checkBtn.textContent === 'Incorrect')) return;

        // Validation
        let correctCount = 0;
        connections.forEach(conn => {
          const leftId = leftItems[conn.leftIndex].val;
          const rightId = rightItems[conn.rightIndex].val;

          const pair = question.pairs!.find(p => p.left === leftId);
          if (pair && pair.right === rightId) {
            correctCount++;
            conn.line.setAttribute("stroke", "#22c55e"); // Green
          } else {
            conn.line.setAttribute("stroke", "#ef4444"); // Red
          }
        });

        const isCorrect = correctCount === question.pairs!.length;
        const answer = connections.map(c => `${leftItems[c.leftIndex].val} -> ${rightItems[c.rightIndex].val}`);

        showFeedback(feedback, isCorrect);
        checkBtn.disabled = true;
        checkBtn.textContent = isCorrect ? 'Correct' : 'Incorrect';
        onAnswer(isCorrect, answer);
      };
    }
  } catch (err) {
    console.error("Error rendering question:", err);
    container.innerHTML = '<div class="text-red-500 p-4">Error loading question.</div>';
  }
};

const showFeedback = (el: HTMLElement, isCorrect: boolean, textCorrect?: string, textWrong?: string) => {
  el.classList.remove('hidden', 'bg-green-500/10', 'border-green-500', 'text-green-400', 'bg-red-500/10', 'border-red-500', 'text-red-400', 'scale-95', 'opacity-0');
  if (isCorrect) {
    el.innerHTML = `<div class="text-2xl mb-1">🎉</div>${textCorrect || "Excellent! That is correct."}`;
    el.classList.add('bg-green-500/10', 'border-green-500', 'text-green-400', 'block', 'scale-100', 'opacity-100');
  } else {
    el.innerHTML = `<div class="text-2xl mb-1">🧐</div>${textWrong || "Not quite. Review the video and try again."}`;
    el.classList.add('bg-red-500/10', 'border-red-500', 'text-red-400', 'block', 'scale-100', 'opacity-100');
  }
};
