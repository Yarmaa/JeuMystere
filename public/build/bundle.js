
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    const seen_callbacks = new Set();
    function flush() {
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.18.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/App.svelte generated by Svelte v3.18.1 */

    const file = "src/App.svelte";

    // (62:0) {#if mort === false}
    function create_if_block_3(ctx) {
    	let p0;
    	let t0;
    	let t1;
    	let t2;
    	let p1;
    	let t3;
    	let span0;
    	let t4;
    	let t5;
    	let p2;
    	let t6;
    	let t7;
    	let t8;
    	let p3;
    	let span1;
    	let input;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			t0 = text("L'indice est ... ");
    			t1 = text(/*indice*/ ctx[6]);
    			t2 = space();
    			p1 = element("p");
    			t3 = text("Nombres de coups restant ... ");
    			span0 = element("span");
    			t4 = text(/*vies*/ ctx[4]);
    			t5 = space();
    			p2 = element("p");
    			t6 = text("Nomres de points gagné ... ");
    			t7 = text(/*points*/ ctx[5]);
    			t8 = space();
    			p3 = element("p");
    			span1 = element("span");
    			span1.textContent = "Alors quel est le mot mystere ?";
    			input = element("input");
    			button = element("button");
    			button.textContent = "OK";
    			attr_dev(p0, "class", "svelte-2r37nq");
    			add_location(p0, file, 62, 1, 1119);
    			set_style(span0, "color", "rgb(204, 65, 65)");
    			attr_dev(span0, "class", "svelte-2r37nq");
    			add_location(span0, file, 63, 33, 1185);
    			attr_dev(p1, "class", "svelte-2r37nq");
    			add_location(p1, file, 63, 1, 1153);
    			attr_dev(p2, "class", "svelte-2r37nq");
    			add_location(p2, file, 64, 1, 1243);
    			attr_dev(span1, "class", "svelte-2r37nq");
    			add_location(span1, file, 65, 4, 1291);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Mot mystère");
    			attr_dev(input, "class", "svelte-2r37nq");
    			add_location(input, file, 65, 48, 1335);
    			add_location(button, file, 65, 114, 1401);
    			attr_dev(p3, "class", "svelte-2r37nq");
    			add_location(p3, file, 65, 1, 1288);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t0);
    			append_dev(p0, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t3);
    			append_dev(p1, span0);
    			append_dev(span0, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p2, anchor);
    			append_dev(p2, t6);
    			append_dev(p2, t7);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, p3, anchor);
    			append_dev(p3, span1);
    			append_dev(p3, input);
    			set_input_value(input, /*reponse*/ ctx[2]);
    			append_dev(p3, button);

    			dispose = [
    				listen_dev(input, "input", /*input_input_handler*/ ctx[16]),
    				listen_dev(button, "click", nettoyer, false, false, false),
    				listen_dev(button, "click", /*validation*/ ctx[7], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*indice*/ 64) set_data_dev(t1, /*indice*/ ctx[6]);
    			if (dirty & /*vies*/ 16) set_data_dev(t4, /*vies*/ ctx[4]);
    			if (dirty & /*points*/ 32) set_data_dev(t7, /*points*/ ctx[5]);

    			if (dirty & /*reponse*/ 4 && input.value !== /*reponse*/ ctx[2]) {
    				set_input_value(input, /*reponse*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(p2);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(p3);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(62:0) {#if mort === false}",
    		ctx
    	});

    	return block;
    }

    // (68:0) {#if gagne}
    function create_if_block_2(ctx) {
    	let p;
    	let t0;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("🎉🎉🎉🎉 BRAVO !!!! 🎉🎉🎉🎉🎉  ");
    			button = element("button");
    			button.textContent = "Un autre mot !";
    			add_location(button, file, 68, 36, 1522);
    			attr_dev(p, "class", "svelte-2r37nq");
    			add_location(p, file, 68, 1, 1487);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, button);
    			dispose = listen_dev(button, "click", /*continuer*/ ctx[9], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(68:0) {#if gagne}",
    		ctx
    	});

    	return block;
    }

    // (73:0) {#if perdu}
    function create_if_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Ce n'est pas le mot mystère ... 😢";
    			attr_dev(p, "class", "svelte-2r37nq");
    			add_location(p, file, 73, 1, 1602);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(73:0) {#if perdu}",
    		ctx
    	});

    	return block;
    }

    // (77:0) {#if mort}
    function create_if_block(ctx) {
    	let p;
    	let t0;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("La partie s'arrete ici ... 💀   ");
    			button = element("button");
    			button.textContent = "Recommencer ?";
    			add_location(button, file, 77, 36, 1698);
    			attr_dev(p, "class", "svelte-2r37nq");
    			add_location(p, file, 77, 1, 1663);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, button);
    			dispose = listen_dev(button, "click", /*recommencer*/ ctx[8], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(77:0) {#if mort}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let h1;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let if_block3_anchor;
    	let if_block0 = /*mort*/ ctx[3] === false && create_if_block_3(ctx);
    	let if_block1 = /*gagne*/ ctx[0] && create_if_block_2(ctx);
    	let if_block2 = /*perdu*/ ctx[1] && create_if_block_1(ctx);
    	let if_block3 = /*mort*/ ctx[3] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Le grand jeu du MOT MYSTERE";
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();
    			if (if_block2) if_block2.c();
    			t4 = space();
    			if (if_block3) if_block3.c();
    			if_block3_anchor = empty();
    			attr_dev(h1, "class", "svelte-2r37nq");
    			add_location(h1, file, 60, 0, 1060);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, t4, anchor);
    			if (if_block3) if_block3.m(target, anchor);
    			insert_dev(target, if_block3_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*mort*/ ctx[3] === false) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(t2.parentNode, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*gagne*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(t3.parentNode, t3);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*perdu*/ ctx[1]) {
    				if (!if_block2) {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(t4.parentNode, t4);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*mort*/ ctx[3]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block(ctx);
    					if_block3.c();
    					if_block3.m(if_block3_anchor.parentNode, if_block3_anchor);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t3);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(t4);
    			if (if_block3) if_block3.d(detaching);
    			if (detaching) detach_dev(if_block3_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function nettoyer() {
    	document.querySelector("input").value = "";
    }

    function instance($$self, $$props, $$invalidate) {
    	const mots = [
    		"banane",
    		"caca",
    		"sushi",
    		"café",
    		"parapluie",
    		"riz",
    		"drapeau",
    		"horloge",
    		"doigt",
    		"nuage",
    		"montagne"
    	];

    	const indices = ["🍌", "💩", "🍣", "🍵", "☔", "🍚", "🏴", "⏲", "☝", "☁", "🏔"];
    	let gagne = false;
    	let perdu = false;
    	let reponse;
    	let mort = false;
    	let idRandom, id;
    	aleatoire();

    	function validation() {
    		$$invalidate(2, reponse = reponse.toLowerCase());

    		if (reponse === mot) {
    			$$invalidate(0, gagne = true);
    			$$invalidate(1, perdu = false);
    		} else {
    			$$invalidate(0, gagne = false);
    			$$invalidate(1, perdu = true);
    			nettoyer();
    			$$invalidate(4, vies = vies - 1);

    			if (vies === 0) {
    				$$invalidate(3, mort = true);
    			}
    		}
    	}

    	function recommencer() {
    		$$invalidate(5, points = 0);
    		$$invalidate(3, mort = false);
    		$$invalidate(4, vies = 3);
    		$$invalidate(0, gagne = false);
    		$$invalidate(1, perdu = false);
    		aleatoire();
    	}

    	function continuer() {
    		$$invalidate(5, points += 1);
    		$$invalidate(0, gagne = false);
    		$$invalidate(1, perdu = false);
    		aleatoire();
    	}

    	function aleatoire() {
    		idRandom = Math.random() * (mots.length - 0) + 0;
    		$$invalidate(11, id = Math.round(idRandom));
    	}

    	function input_input_handler() {
    		reponse = this.value;
    		$$invalidate(2, reponse);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("gagne" in $$props) $$invalidate(0, gagne = $$props.gagne);
    		if ("perdu" in $$props) $$invalidate(1, perdu = $$props.perdu);
    		if ("reponse" in $$props) $$invalidate(2, reponse = $$props.reponse);
    		if ("mort" in $$props) $$invalidate(3, mort = $$props.mort);
    		if ("idRandom" in $$props) idRandom = $$props.idRandom;
    		if ("id" in $$props) $$invalidate(11, id = $$props.id);
    		if ("vies" in $$props) $$invalidate(4, vies = $$props.vies);
    		if ("points" in $$props) $$invalidate(5, points = $$props.points);
    		if ("mot" in $$props) mot = $$props.mot;
    		if ("indice" in $$props) $$invalidate(6, indice = $$props.indice);
    	};

    	let vies;
    	let points;
    	let mot;
    	let indice;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*id*/ 2048) {
    			 mot = mots[id];
    		}

    		if ($$self.$$.dirty & /*id*/ 2048) {
    			 $$invalidate(6, indice = indices[id]);
    		}
    	};

    	 $$invalidate(4, vies = 3);
    	 $$invalidate(5, points = 0);

    	return [
    		gagne,
    		perdu,
    		reponse,
    		mort,
    		vies,
    		points,
    		indice,
    		validation,
    		recommencer,
    		continuer,
    		idRandom,
    		id,
    		mot,
    		mots,
    		indices,
    		aleatoire,
    		input_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
