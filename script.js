(() => {
    const form = document.querySelector('form.lead-form');
    if (!form) return;

    const phoneInput = document.getElementById('phone');
    const emailInput = document.getElementById('email');
    const phoneField = phoneInput.closest('.field');
    const emailField = emailInput.closest('.field');
    const phoneError = document.getElementById('phone-error');
    const emailError = document.getElementById('email-error');

    const firstNameInput = document.getElementById('first_name');
    const lastNameInput = document.getElementById('last_name');
    const idInput = document.getElementById('id_number');
    const inlineName = document.getElementById('inline-name');
    const inlineId = document.getElementById('inline-id');

    const signatureWrap = document.getElementById('signature-pad-wrap');
    const signatureCanvas = document.getElementById('signature-pad');
    const signatureClearBtn = document.getElementById('signature-clear');
    const signatureImageInput = document.getElementById('signature-image');
    const signaturePlaceholder = document.getElementById('signature-placeholder');
    const signatureError = document.getElementById('signature-error');
    const signatureField = signatureWrap.closest('.field');

    const formSection = document.querySelector('.form-section');
    const successPanel = document.querySelector('.success-panel');
    const submitBtn = form.querySelector('.submit-btn');
    const btnLabel = submitBtn.querySelector('.btn-label');

    /* ---------- intl-tel-input ---------- */

    const iti = window.intlTelInput(phoneInput, {
        initialCountry: 'il',
        separateDialCode: true,
        strictMode: true,
        formatAsYouType: true,
        loadUtils: () =>
            import('https://cdn.jsdelivr.net/npm/intl-tel-input@25.3.1/build/js/utils.js'),
    });

    /* ---------- Validators ---------- */

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const validatePhone = (touched = true) => {
        const raw = phoneInput.value.trim();
        if (!raw) {
            if (touched) showError(phoneField, phoneError, 'Phone number is required.');
            return false;
        }
        const valid = typeof iti.isValidNumber === 'function' ? iti.isValidNumber() : true;
        if (!valid) {
            if (touched) showError(phoneField, phoneError, 'Please enter a valid phone number.');
            return false;
        }
        clearError(phoneField, phoneError);
        return true;
    };

    const validateEmail = (touched = true) => {
        const val = emailInput.value.trim();
        if (!val) {
            if (touched) showError(emailField, emailError, 'Email is required.');
            return false;
        }
        if (!emailRe.test(val)) {
            if (touched) showError(emailField, emailError, 'Please enter a valid email address.');
            return false;
        }
        clearError(emailField, emailError);
        return true;
    };

    function showError(fieldEl, errorEl, msg) {
        fieldEl.classList.add('invalid');
        errorEl.textContent = msg;
        errorEl.hidden = false;
    }

    function clearError(fieldEl, errorEl) {
        fieldEl.classList.remove('invalid');
        errorEl.hidden = true;
    }

    /* ---------- Real-time events ---------- */

    phoneInput.addEventListener('blur', () => validatePhone(true));
    phoneInput.addEventListener('input', () => {
        if (phoneField.classList.contains('invalid')) validatePhone(true);
    });
    phoneInput.addEventListener('countrychange', () => {
        if (phoneField.classList.contains('invalid')) validatePhone(true);
    });

    emailInput.addEventListener('blur', () => validateEmail(true));
    emailInput.addEventListener('input', () => {
        if (emailField.classList.contains('invalid')) validateEmail(true);
    });

    /* ---------- Bank / branch: digits only ---------- */

    ['bank_number', 'branch_number'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            el.value = el.value.replace(/\D/g, '').slice(0, 3);
        });
    });

    /* ---------- Inline signer mirror ---------- */

    const setInline = (el, value) => {
        if (value) {
            el.textContent = value;
            el.classList.remove('is-placeholder');
        } else {
            el.textContent = el.dataset.placeholder;
            el.classList.add('is-placeholder');
        }
    };

    const updateSignatory = () => {
        const fullName = [firstNameInput.value.trim(), lastNameInput.value.trim()]
            .filter(Boolean)
            .join(' ');
        setInline(inlineName, fullName);
        setInline(inlineId, idInput.value.trim());
    };

    [firstNameInput, lastNameInput, idInput].forEach((el) =>
        el.addEventListener('input', updateSignatory)
    );

    /* ---------- File upload preview ---------- */

    document.querySelectorAll('.file-drop').forEach((drop) => {
        const input = drop.querySelector('input[type="file"]');
        const nameEl = drop.querySelector('.file-name');
        const placeholder = nameEl.dataset.placeholder || 'No file chosen';

        const setLabel = () => {
            const files = input.files;
            if (!files || files.length === 0) {
                nameEl.textContent = placeholder;
                drop.classList.remove('has-file');
                return;
            }
            drop.classList.add('has-file');
            if (files.length === 1) {
                nameEl.textContent = files[0].name;
            } else {
                nameEl.textContent = `${files.length} files selected`;
            }
        };

        input.addEventListener('change', setLabel);

        // Drag-and-drop support
        ['dragenter', 'dragover'].forEach((evt) =>
            drop.addEventListener(evt, (e) => {
                e.preventDefault();
                drop.classList.add('is-dragover');
            })
        );
        ['dragleave', 'dragend', 'drop'].forEach((evt) =>
            drop.addEventListener(evt, (e) => {
                e.preventDefault();
                drop.classList.remove('is-dragover');
            })
        );
        drop.addEventListener('drop', (e) => {
            if (e.dataTransfer?.files?.length) {
                input.files = e.dataTransfer.files;
                setLabel();
            }
        });
    });

    /* ---------- Signature pad ---------- */

    const pad = (() => {
        const ctx = signatureCanvas.getContext('2d');
        let drawing = false;
        let hasStrokes = false;
        let lastX = 0;
        let lastY = 0;

        const resetTransform = () => {
            if (ctx.resetTransform) ctx.resetTransform();
            else ctx.setTransform(1, 0, 0, 1, 0, 0);
        };

        const setStyle = () => {
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#D1DCBD';
        };

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = signatureCanvas.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            signatureCanvas.width = Math.round(rect.width * dpr);
            signatureCanvas.height = Math.round(rect.height * dpr);
            resetTransform();
            ctx.scale(dpr, dpr);
            setStyle();
        };

        const getPoint = (e) => {
            const rect = signatureCanvas.getBoundingClientRect();
            const t = e.touches ? e.touches[0] : e;
            return { x: t.clientX - rect.left, y: t.clientY - rect.top };
        };

        const markSigned = () => {
            signatureWrap.classList.add('is-signed');
            signatureImageInput.value = signatureCanvas.toDataURL('image/png');
            if (signatureField.classList.contains('invalid')) {
                clearError(signatureField, signatureError);
            }
        };

        const clear = () => {
            resetTransform();
            ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
            const dpr = window.devicePixelRatio || 1;
            ctx.scale(dpr, dpr);
            setStyle();
            hasStrokes = false;
            signatureImageInput.value = '';
            signatureWrap.classList.remove('is-signed');
        };

        const start = (e) => {
            e.preventDefault();
            drawing = true;
            const p = getPoint(e);
            lastX = p.x;
            lastY = p.y;
            // dot for taps
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
            ctx.fillStyle = '#D1DCBD';
            ctx.fill();
            hasStrokes = true;
            markSigned();
        };

        const move = (e) => {
            if (!drawing) return;
            e.preventDefault();
            const p = getPoint(e);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            lastX = p.x;
            lastY = p.y;
            hasStrokes = true;
            markSigned();
        };

        const end = () => {
            drawing = false;
        };

        signatureCanvas.addEventListener('mousedown', start);
        signatureCanvas.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
        signatureCanvas.addEventListener('mouseleave', end);

        signatureCanvas.addEventListener('touchstart', start, { passive: false });
        signatureCanvas.addEventListener('touchmove', move, { passive: false });
        signatureCanvas.addEventListener('touchend', end);
        signatureCanvas.addEventListener('touchcancel', end);

        signatureClearBtn.addEventListener('click', clear);

        // Resize: if signed, warn. Simpler: only resize if empty, otherwise keep as-is.
        let rafId = null;
        window.addEventListener('resize', () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                if (!hasStrokes) resize();
            });
        });

        resize();

        return {
            clear,
            isSigned: () => hasStrokes,
        };
    })();

    /* ---------- Submit ---------- */

    // Shared HMAC secret between this client JS and the Netlify Function.
    // Browser can see this; real anti-abuse lives at the edge (rate limits).
    const HMAC_SECRET = '40a0564a1fde1964ceacd4dc0ff2e87a251a87a0380b549b0735e997b526c766';
    const SUBMIT_ENDPOINT = '/.netlify/functions/submit';

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    function sortKeys(val) {
        if (Array.isArray(val)) return val.map(sortKeys);
        if (val && typeof val === 'object') {
            const out = {};
            for (const k of Object.keys(val).sort()) out[k] = sortKeys(val[k]);
            return out;
        }
        return val;
    }

    function canonicalJson(obj) {
        return JSON.stringify(sortKeys(obj));
    }

    async function hmacSha256Hex(secret, message) {
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            enc.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
        return Array.from(new Uint8Array(sig))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }

    function uuid() {
        if (crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    function isoToDate(isoLike) {
        // Accept YYYY-MM-DD and pass through; otherwise attempt Date parse.
        if (/^\d{4}-\d{2}-\d{2}$/.test(isoLike)) return isoLike;
        const d = new Date(isoLike);
        if (Number.isNaN(d.getTime())) return isoLike;
        return d.toISOString().slice(0, 10);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const phoneOk = validatePhone(true);
        const emailOk = validateEmail(true);
        const signatureOk = pad.isSigned();

        if (!signatureOk) {
            showError(signatureField, signatureError, 'Please sign above before submitting.');
        } else {
            clearError(signatureField, signatureError);
        }

        if (!form.checkValidity() || !phoneOk || !emailOk || !signatureOk) {
            form.reportValidity();
            if (!phoneOk) phoneInput.focus();
            else if (!emailOk) emailInput.focus();
            else if (!signatureOk) signatureWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const originalLabel = btnLabel.textContent;
        submitBtn.disabled = true;
        btnLabel.textContent = 'Submitting…';

        try {
            const fd = new FormData(form);

            // Files → base64 data URLs.
            const profileFile = fd.get('profile_picture');
            const certFiles = fd.getAll('certifications').filter((f) => f instanceof File && f.size > 0);

            const profileDataUrl = profileFile instanceof File && profileFile.size > 0
                ? await readFileAsDataUrl(profileFile)
                : null;
            const certDataUrls = await Promise.all(certFiles.map(readFileAsDataUrl));

            const payload = {
                submission_id: uuid(),
                submitted_at: new Date().toISOString(),

                first_name: (fd.get('first_name') || '').toString().trim(),
                last_name: (fd.get('last_name') || '').toString().trim(),
                email: (fd.get('email') || '').toString().trim(),
                phone: typeof iti.getNumber === 'function' ? iti.getNumber() : (fd.get('phone') || '').toString(),
                phone_country: (iti.getSelectedCountryData().iso2 || '').toLowerCase() || null,
                id_number: (fd.get('id_number') || '').toString().trim(),
                birthday: isoToDate((fd.get('birthday') || '').toString()),
                gender: (fd.get('gender') || '').toString(),
                instagram: (fd.get('instagram') || '').toString().trim() || null,

                business_type: (fd.get('business_type') || '').toString(),
                bank_number: (fd.get('bank_number') || '').toString(),
                branch_number: (fd.get('branch_number') || '').toString(),
                account_number: (fd.get('account_number') || '').toString().trim(),

                notes: (fd.get('notes') || '').toString().trim() || null,

                profile_picture: profileDataUrl,
                certifications: certDataUrls,
                signature_data_url: (fd.get('signature_image') || '').toString(),
            };

            // Strip null-ish keys we don't want to send (the server Zod schema
            // treats optional fields as absent, not null).
            for (const k of ['phone_country', 'instagram', 'notes', 'profile_picture']) {
                if (payload[k] === null) delete payload[k];
            }

            const canonical = canonicalJson(payload);
            const signature = await hmacSha256Hex(HMAC_SECRET, canonical);

            const response = await fetch(SUBMIT_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature,
                },
                body: canonical,
            });

            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error('Submission failed: ' + response.status + ' ' + text.slice(0, 200));
            }

            formSection.classList.add('submitted');
            successPanel.hidden = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error(err);
            btnLabel.textContent = 'Try again';
            submitBtn.disabled = false;
            setTimeout(() => {
                btnLabel.textContent = originalLabel;
            }, 2500);
        }
    });
})();
