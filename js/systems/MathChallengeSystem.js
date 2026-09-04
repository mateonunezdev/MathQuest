export class MathChallengeSystem {
    constructor() {
        this.active = false;
        this.callback = null;
        this.challengeData = null;
        this.selectedAnswer = null;
        this.feedback = '';
        this.feedbackType = '';
        this.animTime = 0;

        this.challenges = {
            'door1': {
                question: '7 × (3 + 2) = ?',
                options: { A: '28', B: '35', C: '42' },
                correct: 'B',
                skill: 'Orden de operaciones'
            }
        };

        this.modal = document.querySelector('#challenge');
        this.feedbackEl = document.querySelector('#feedback');
        this.answerButtons = document.querySelectorAll('[data-answer]');
        this.setupButtons();
    }

    setupButtons() {
        this.answerButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.active) this.submitAnswer(btn.dataset.answer);
            });
        });
    }

    open(challengeId, callback) {
        this.challengeData = this.challenges[challengeId];
        this.callback = callback;
        this.active = true;
        this.selectedAnswer = null;
        this.feedback = '';
        this.feedbackType = '';
        this.animTime = 0;

        if (this.challengeData) {
            document.querySelector('#challenge h2').textContent = this.challengeData.question;
            this.answerButtons.forEach(btn => {
                const key = btn.dataset.answer;
                btn.querySelector('span') || (btn.innerHTML = `${key} · ${this.challengeData.options[key]}`);
                btn.disabled = false;
                btn.classList.remove('correct', 'incorrect');
            });
            this.feedbackEl.textContent = '';
        }

        this.modal.classList.remove('hidden');
        this.modal.querySelector('.card').style.animation = 'modalIn 0.3s ease-out';
    }

    update(dt) {
        this.animTime += dt;
        const answerKey = window.game?.input?.getAnswerKey?.();
        if (answerKey) this.submitAnswer(answerKey);
    }

    submitAnswer(letter) {
        if (!this.active || this.selectedAnswer) return;

        this.selectedAnswer = letter;
        const correct = letter === this.challengeData.correct;

        this.answerButtons.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.answer === letter) {
                btn.classList.add(correct ? 'correct' : 'incorrect');
            }
            if (btn.dataset.answer === this.challengeData.correct) {
                btn.classList.add('correct');
            }
        });

        if (correct) {
            this.feedback = '✅ Correcto. Puerta desbloqueada.';
            this.feedbackType = 'success';
            this.feedbackEl.style.color = '#37c4ff';
        } else {
            this.feedback = '❌ Incorrecto. Intenta otra vez.';
            this.feedbackType = 'error';
            this.feedbackEl.style.color = '#ff6b6b';
        }
        this.feedbackEl.textContent = this.feedback;

        setTimeout(() => {
            this.close(correct);
        }, 800);
    }

    close(correct) {
        this.modal.classList.add('hidden');
        this.active = false;
        if (this.callback) this.callback(correct);
        this.callback = null;
    }
}