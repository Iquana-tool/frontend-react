import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Database, LogIn, ArrowRight, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useInstance, contactHref, PROJECT_URL } from '../hooks/useInstance';
import Wordmark from '../components/Wordmark';

/**
 * The front door of a self-hosted IQUANA deployment.
 *
 * This replaces the old marketing landing page, which pitched the tool to people
 * who had, by definition, already found and installed it. An instance is reached
 * by someone who was sent a hostname: what they need is to know whose instance it
 * is, sign in, or find out who to ask for an account. The product pitch lives at
 * the public project site instead.
 *
 * Instance-specific wording comes from the backend — see `useInstance` for why it
 * is not held in the frontend's build — and every part of it is optional, so an
 * unconfigured install still reads as a finished page rather than a template with
 * holes in it.
 */

/**
 * Where to send the user after signing in.
 *
 * Only same-site paths are honoured: `?next=` comes from the URL bar, so an
 * absolute URL there would turn this page into an open redirect.
 */
const resolveNextPath = (search) => {
    const next = new URLSearchParams(search).get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
        return next;
    }
    return '/datasets';
};

const InstanceLandingPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, isLoading, isAuthenticated } = useAuth();
    const { instance, loading: instanceLoading } = useInstance();
    const navigate = useNavigate();
    const location = useLocation();

    const nextPath = resolveNextPath(location.search);

    useEffect(() => {
        if (isAuthenticated) {
            navigate(nextPath, { replace: true });
        }
    }, [isAuthenticated, navigate, nextPath]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please enter both username and password');
            return;
        }

        try {
            await login(username, password);
            navigate(nextPath, { replace: true });
        } catch (err) {
            setError(err.message || 'Login failed. Please check your credentials.');
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-app">
            <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6">
                <div className="w-full max-w-md">

                    {/* Brand and welcome.
                        The instance name arrives a moment after first paint, so the
                        greeting is held back rather than rendered as "Welcome to
                        IQUANA" and then swapped — a heading that rewrites itself
                        reads as a glitch. The form below never waits on it. */}
                    <div className="text-center mb-9">
                        <div className="inline-flex items-center gap-[8px] mb-7">
                            <div className="w-10 h-10 bg-accent rounded-8 flex items-center justify-center">
                                <Database className="w-[22px] h-[22px] text-onAccent" />
                            </div>
                            <Wordmark className="text-2xl font-semibold tracking-tight text-t1" />
                        </div>

                        {instanceLoading ? (
                            <div aria-hidden="true">
                                <div className="h-8 w-3/5 mx-auto rounded-8 bg-well mb-4" />
                                <div className="h-4 w-full rounded-8 bg-well mb-2" />
                                <div className="h-4 w-4/5 mx-auto rounded-8 bg-well" />
                            </div>
                        ) : (
                            <>
                                <h1 className="text-3xl font-semibold tracking-tight text-t1 mb-3 leading-tight">
                                    Welcome to {instance.name || 'IQUANA'}
                                </h1>
                                <p className="text-t2 text-sm leading-relaxed">
                                    {instance.name ? 'An instance of ' : 'This is '}
                                    <a
                                        href={PROJECT_URL}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-ac font-medium hover:brightness-110 transition-all duration-150"
                                    >
                                        IQUANA
                                    </a>
                                    , a tool for AI-assisted annotation and quantification of
                                    scientific image data
                                    {instance.organisation ? <>, hosted by {instance.organisation}</> : null}.
                                    {' '}Please sign in to get started.
                                </p>
                            </>
                        )}
                    </div>

                    {/* Sign-in */}
                    <div className="bg-p1 border border-ln rounded-12 shadow-modal p-8">
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {error && (
                                <div className="rounded-8 bg-errBg border border-errLn p-[14px] animate-slide-up">
                                    <div className="text-sm text-err font-medium">{error}</div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="username" className="block text-sm font-medium text-t2 mb-2">
                                        Username
                                    </label>
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        autoComplete="username"
                                        required
                                        className="w-full px-[14px] py-[10px] bg-well border border-ln rounded-8 text-t1 placeholder-t3 focus:outline-none focus:ring-2 focus:ring-ac focus:border-ac transition-colors duration-150"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-t2 mb-2">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        className="w-full px-[14px] py-[10px] bg-well border border-ln rounded-8 text-t1 placeholder-t3 focus:outline-none focus:ring-2 focus:ring-ac focus:border-ac transition-colors duration-150"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group w-full flex items-center justify-center gap-[8px] px-6 py-[11px] text-base font-semibold text-onAccent bg-accent rounded-8 shadow-primary hover:brightness-110 active:brightness-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-[18px] h-[18px] border-2 border-onAccent border-t-transparent rounded-full animate-spin" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-[18px] h-[18px]" />
                                        <span>Sign in</span>
                                        <ArrowRight className="w-[18px] h-[18px] group-hover:translate-x-1 transition-transform duration-150" />
                                    </>
                                )}
                            </button>

                            {/* How to get an account. Instances hand out credentials
                                deliberately, so the default is "ask someone" rather than
                                "sign yourself up" — and the backend refuses registration
                                unless this instance opted in, so this is not the only
                                thing keeping the door shut. */}
                            {!instanceLoading && (
                                <div className="text-center pt-4 border-t border-ln">
                                    {instance.allow_registration ? (
                                        <p className="text-sm text-t2">
                                            Don&apos;t have an account?{' '}
                                            <Link
                                                to="/register"
                                                className="font-medium text-ac hover:brightness-110 transition-all duration-150 inline-flex items-center gap-[4px] group"
                                            >
                                                <span>Create one</span>
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-150" />
                                            </Link>
                                        </p>
                                    ) : instance.contact ? (
                                        <p className="text-sm text-t2">
                                            Need an account? Request access from{' '}
                                            {contactHref(instance.contact) ? (
                                                <a
                                                    href={contactHref(instance.contact)}
                                                    className="font-medium text-ac hover:brightness-110 transition-all duration-150"
                                                >
                                                    {instance.contact}
                                                </a>
                                            ) : (
                                                <span className="font-medium text-t1">{instance.contact}</span>
                                            )}
                                            .
                                        </p>
                                    ) : (
                                        <p className="text-sm text-t3">
                                            Accounts on this instance are issued by its administrator.
                                        </p>
                                    )}
                                </div>
                            )}
                        </form>
                    </div>

                    {instance.notice && (
                        <p className="text-center text-xs text-t3 mt-5 leading-relaxed">
                            {instance.notice}
                        </p>
                    )}
                </div>
            </main>

            {/* The escape hatch: someone who landed here without context can find out
                what the tool actually is without needing an account first. HIFMB is
                named as the partner the tool was built with, not as a host — this
                page's host is whoever runs the instance. */}
            <footer className="border-t border-ln py-6 px-6">
                <div className="max-w-md mx-auto text-center">
                    <p className="text-xs text-t3 leading-relaxed">
                        IQUANA is developed at{' '}
                        <a href="https://www.dfki.de/" target="_blank" rel="noreferrer" className="text-t2 hover:text-ac transition-colors duration-150">
                            DFKI
                        </a>{' '}
                        in partnership with{' '}
                        <a href="https://hifmb.de/" target="_blank" rel="noreferrer" className="text-t2 hover:text-ac transition-colors duration-150">
                            HIFMB
                        </a>
                        .
                    </p>
                    <a
                        href={PROJECT_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-[5px] text-xs text-t3 hover:text-ac transition-colors duration-150 mt-2"
                    >
                        <span>About the project</span>
                        <ExternalLink className="w-[11px] h-[11px]" />
                    </a>
                </div>
            </footer>
        </div>
    );
};

export default InstanceLandingPage;
