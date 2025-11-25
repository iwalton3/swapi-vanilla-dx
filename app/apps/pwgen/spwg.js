/**
 * Password Generator Component (SPWG)
 */

import { defineComponent } from '../../core/component.js';
import { html, raw } from '../../core/template.js';
import { fromlength, fromlengthbatch, frombits, frommax, tonumber, towords } from './spwg_api.js';

defineComponent('spwg-page', {
    data() {
        return {
            response: '',
            entropy: '',
            combinations: '',
            number: '',
            password: '',
            count: 10,
            words: 4
        };
    },

    async mounted() {
        // Load initial password with default word count
        await this.fromWords();
    },

    template() {
        return html`
            <div>
                <h1>Secure Passphrase Generator</h1>

                <!-- Response display -->
                <div class="section">
                    ${raw(this.state.response)}
                </div>

                <p><strong>I want a password with...</strong></p>

                <!-- Entropy input -->
                <div class="section">
                    <form on-submit-prevent="fromBits">
                        <label>
                            <input class="sm" id="entropy-input" value="${this.state.entropy}" type="number" min="1" max="1000">
                            bits of entropy.
                        </label>
                        <input type="submit" value="Generate">
                    </form>

                    <!-- Words input -->
                    <form on-submit-prevent="fromWords">
                        <label>
                            <input class="sm" id="words-input" value="${this.state.words}" type="number" min="1" max="20">
                            words.
                        </label>
                        <input type="submit" value="Generate">
                    </form>

                    <!-- Combinations input -->
                    <form on-submit-prevent="fromMax">
                        <label>
                            <input id="combinations-input" value="${this.state.combinations}" type="number" min="1">
                            possible combinations.
                        </label>
                        <input type="submit" value="Generate">
                    </form>
                </div>

                <!-- Conversion tools -->
                <div class="section">
                    <h3>Conversion Tools</h3>

                    <form on-submit-prevent="toWordsSubmit">
                        <label>
                            Convert the number
                            <input id="number-input" value="${this.state.number}" type="number" style="width: 200px;">
                            to a password.
                        </label>
                        <input type="submit" value="Convert">
                    </form>

                    <form on-submit-prevent="fromPassword">
                        <label>
                            Convert the password
                            <input id="password-input" value="${this.state.password}" type="text" style="width: 200px;">
                            to a number.
                        </label>
                        <input type="submit" value="Convert">
                    </form>
                </div>

                <!-- Batch generation -->
                <div class="section">
                    <h3>Batch Generation</h3>

                    <form on-submit-prevent="batchGenerate">
                        <label>
                            Generate <input class="sm" id="count-input" value="${this.state.count}" type="number" min="1" max="100"> passwords
                            with <input class="sm" id="words-batch-input" value="${this.state.words}" type="number" min="1" max="20"> words.
                        </label>
                        <input type="submit" value="Generate Batch">
                    </form>
                </div>
            </div>
        `;
    },

    methods: {
        async fromBits() {
            try {
                const entropyInput = this.querySelector('#entropy-input');
                if (entropyInput) this.state.entropy = entropyInput.value;

                this.state.response = await frombits(this.state.entropy);
            } catch (error) {
                this.state.response = '<p class="error">Error generating password from bits.</p>';
            }
        },

        async fromWords() {
            try {
                const wordsInput = this.querySelector('#words-input');
                if (wordsInput) this.state.words = parseInt(wordsInput.value);

                this.state.response = await fromlength(this.state.words);
            } catch (error) {
                this.state.response = '<p class="error">Error generating password from word count.</p>';
            }
        },

        async fromMax() {
            try {
                const combinationsInput = this.querySelector('#combinations-input');
                if (combinationsInput) this.state.combinations = combinationsInput.value;

                this.state.response = await frommax(this.state.combinations);
            } catch (error) {
                this.state.response = '<p class="error">Error generating password from combinations.</p>';
            }
        },

        async toWordsSubmit() {
            try {
                const numberInput = this.querySelector('#number-input');
                if (numberInput) this.state.number = numberInput.value;

                this.state.response = await towords(this.state.number);
            } catch (error) {
                this.state.response = '<p class="error">Error converting number to words.</p>';
            }
        },

        async fromPassword() {
            try {
                const passwordInput = this.querySelector('#password-input');
                if (passwordInput) this.state.password = passwordInput.value;

                this.state.response = await tonumber(this.state.password);
            } catch (error) {
                this.state.response = '<p class="error">That password cannot be converted to a number.</p>';
            }
        },

        async batchGenerate() {
            try {
                const countInput = this.querySelector('#count-input');
                const wordsBatchInput = this.querySelector('#words-batch-input');
                if (countInput) this.state.count = parseInt(countInput.value);
                if (wordsBatchInput) this.state.words = parseInt(wordsBatchInput.value);

                this.state.response = await fromlengthbatch(this.state.words, this.state.count);
            } catch (error) {
                this.state.response = '<p class="error">Error generating batch passwords.</p>';
            }
        }
    },

    styles: `
        form {
            display: block;
            margin: 15px 0;
        }

        label {
            display: inline;
            margin-right: 10px;
        }

        .sm {
            width: 3em;
        }

        h3 {
            margin-top: 0;
            color: #555;
        }

        /* Form elements with CSS variables for dark theme */
        input[type="text"],
        input[type="number"],
        textarea {
            padding: 8px;
            border: 1px solid var(--input-border, #ddd);
            border-radius: 4px;
            font-size: 14px;
            font-family: inherit;
            background-color: var(--input-bg, white);
            color: var(--input-text, #000);
        }

        input[type="text"]:focus,
        input[type="number"]:focus,
        textarea:focus {
            outline: none;
            border-color: var(--input-focus-border, #0066cc);
            box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        input[type="submit"],
        button {
            padding: 8px;
            border: 1px solid var(--input-border, #ddd);
            border-radius: 4px;
            font-size: 14px;
            font-family: inherit;
            background-color: var(--input-bg, white);
            color: var(--input-text, #000);
            cursor: pointer;
        }

        input[type="submit"]:hover:not(:disabled),
        button:hover:not(:disabled) {
            background-color: var(--input-hover-bg, #f5f5f5);
        }

        input[type="submit"]:disabled,
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `
});
