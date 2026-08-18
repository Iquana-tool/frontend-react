import { useEffect, useState } from 'react';
import { fetchInstance } from '../api/instance';

/** Where the public project site lives — the "what even is this?" escape hatch. */
export const PROJECT_URL = 'https://iquana-tool.github.io/';

/**
 * What an unbranded instance looks like.
 *
 * Also what a *failed* fetch looks like. If the backend is unreachable the
 * sign-in page should still render and let someone try to sign in — the attempt
 * will produce a real error message from the login call, which is far more use
 * than an error page that pre-empts it. Branding is decoration; not knowing it
 * is never a reason to withhold the form.
 */
const UNBRANDED = {
    name: null,
    organisation: null,
    contact: null,
    notice: null,
    allow_registration: false,
};

/**
 * This deployment's branding and account policy, from the backend.
 *
 * Held on the backend rather than in the frontend's environment because Vite
 * substitutes `import.meta.env` at build time: branding baked into the bundle
 * could not be corrected without a rebuild, and the registration policy has to
 * be enforced server-side regardless of what this page chooses to render.
 *
 * @returns {{instance: Object, loading: boolean}}
 */
export const useInstance = () => {
    const [instance, setInstance] = useState(UNBRANDED);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        fetchInstance()
            .then((result) => {
                if (active) setInstance({ ...UNBRANDED, ...result });
            })
            .catch(() => {
                // Deliberately silent: see UNBRANDED above.
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        // The sign-in page navigates away the moment login succeeds, so an
        // in-flight request outliving the component is the normal case here.
        return () => { active = false; };
    }, []);

    return { instance, loading };
};

/** `mailto:` when the contact looks like an address, otherwise no link. */
export const contactHref = (contact) =>
    contact && contact.includes('@') ? `mailto:${contact}` : null;
