/**
 * Internationalization (i18n) for CTF AI Website
 * Supports: German (de), English (en), French (fr)
 */

const translations = {
    de: {
        // Navigation
        nav_demo: "Live Demo",
        nav_stats: "Statistiken",
        nav_docs: "Dokumentation",
        nav_github: "GitHub",

        // Hero
        hero_title: "Capture The Flag<br>Multi-Agent Reinforcement Learning",
        hero_subtitle: "Ein Projekt von Saliou Dieng",
        hero_description: "Wie KI-Agenten durch Reinforcement Learning lernen, in Teams zu kooperieren und komplexe Strategien zu entwickeln – ohne explizite Programmierung.",
        hero_cta_demo: "Live Demo ansehen",
        hero_cta_stats: "Statistiken",
        hero_cta_docs: "Dokumentation lesen",

        // Challenge
        challenge_title: "Die Herausforderung",
        challenge_subtitle: "KI-Agenten beibringen, in komplexen, kompetitiven Umgebungen zusammenzuarbeiten",
        challenge_card1_title: "Multi-Agent System",
        challenge_card1_text: "Zwei Teams von KI-Agenten (Blau vs. Rot) müssen in Echtzeit koordinieren, um die Flagge des Gegners zu erobern und ihre eigene zu verteidigen.",
        challenge_card2_title: "Emergentes Verhalten",
        challenge_card2_text: "Keine expliziten Regeln für Teamwork. Agenten lernen Kooperation durch Trial-and-Error und entdecken Taktiken wie Rollenteilung und strategische Positionierung.",
        challenge_card3_title: "Komplexe Umgebung",
        challenge_card3_text: "24x24 Gitter mit Wänden, Basen und dynamischen Hindernissen. Agenten müssen navigieren, Gegner meiden und Angriffe koordinieren.",
        challenge_diagram_label: "Vereinfachte Darstellung der Spielumgebung",

        // Method
        method_title: "Die Methode",
        method_subtitle: "Proximal Policy Optimization mit maßgeschneiderter Reward-Funktion",
        method_ppo_title: "Reinforcement Learning Algorithmus: PPO",
        method_ppo_text: "Wir verwenden Proximal Policy Optimization (PPO), eine state-of-the-art Policy-Gradient-Methode, die Exploration und Exploitation ausbalanciert. PPO ist bekannt für seine Stabilität und Sample-Effizienz in Multi-Agent-Umgebungen.",
        method_ppo_code: "stable-baselines3 PPO | 100.000+ Timesteps | Paralleles Environment-Training",
        method_reward_title: "Reward-Funktion Design",
        method_reward_text: "Der Kern des Lernens liegt im Reward-Signal. Unsere maßgeschneiderte Reward-Funktion fördert:",
        method_reward_1: "Erobern der gegnerischen Flagge",
        method_reward_2: "Bewegung zur gegnerischen Flagge",
        method_reward_3: "Verteidigung der eigenen Flaggenzone",
        method_reward_4: "Erfolgreiches Stunnen eines Gegners",
        method_reward_5: "Zeit-Penalty (fördert schnelleres Gameplay)",
        method_arch_title: "Training-Architektur",
        method_arch_text: "PettingZoo Multi-Agent Environment | Shared Policy Network | Vector Observation Space (Grid-basierte Vision, Agent-Zustände, Flaggen-Positionen)",

        // Results
        results_title: "Ergebnisse",
        results_subtitle: "Von zufälligem Chaos zu koordinierten Taktiken",
        results_phase1_label: "Phase 1: Zufälliges Chaos (Episode 0)",
        results_phase1_desc: "Agenten wandern ziellos umher, ignorieren Flaggen und Teammitglieder. Kein strategisches Verhalten erkennbar.",
        results_phase2_label: "Phase 2: Taktisches Spiel (Episode 10.000+)",
        results_phase2_desc: "Agenten koordinieren Angriffe, verteidigen strategisch und nutzen Wände als Deckung. Klare Rollenteilung entsteht.",

        // Learnings
        learnings_title: "Wichtigste Erkenntnisse",
        learnings_subtitle: "Emergente Verhaltensweisen durch Reinforcement Learning",
        learnings_card1_title: "1. Pathfinding & Navigation",
        learnings_card1_text: "Agenten lernten, effizient um Wände herum zu navigieren und optimale Routen ins gegnerische Territorium zu finden – ohne explizite Pathfinding-Algorithmen.",
        learnings_card2_title: "2. Rollenteilung",
        learnings_card2_text: "Ohne Programmierung teilten sich Agenten natürlich in offensive und defensive Rollen auf, wobei einige die Basis schützen, während andere angreifen.",
        learnings_card3_title: "3. Kampftaktiken",
        learnings_card3_text: "Agenten entwickelten Timing-Strategien für die Stun-Fähigkeit und lernten, Angriffe zu koordinieren und Flaggenträger zu beschützen.",

        // Dashboard specific
        dashboard_title: "Training Dashboard",
        dashboard_subtitle: "Echtzeit-Analytics und Performance-Metriken aus 100.000+ Training-Timesteps",
        dashboard_run_label: "Training Run:",
        dashboard_run_latest: "Neuester Run (Beta)",
        dashboard_metric_peak: "Höchster Reward",
        dashboard_metric_timesteps: "Gesamt-Timesteps",
        dashboard_metric_length: "Durchschn. Episode-Länge",
        dashboard_chart_reward: "Reward-Fortschritt",
        dashboard_chart_zoom: "Scrollen zum Zoomen | Ziehen zum Verschieben",
        dashboard_chart_reset: "Zoom zurücksetzen",
        dashboard_chart_length: "Episode-Längen-Entwicklung",
        dashboard_chart_dist: "Reward-Verteilung",
        dashboard_config_title: "Training-Konfiguration",
        dashboard_hyper_title: "Hyperparameter",
        dashboard_insights_title: "Performance-Einblicke",

        // Demo specific
        demo_step: "Schritt",
        demo_upload: "Replay hochladen",
        demo_replays: "Verfügbare Replays",
        demo_events: "Event-Log",
        demo_legend: "Legende",
        demo_blue: "Blaues Team",
        demo_red: "Rotes Team",
        demo_flag: "Flagge",

        // Footer
        footer_tech: "Erstellt mit PyTorch, Stable-Baselines3, PettingZoo und Three.js",
        footer_copyright: "© 2025 Reinforcement Learning Forschungsprojekt | Saliou Dieng"
    },

    en: {
        // Navigation
        nav_demo: "Live Demo",
        nav_stats: "Statistics",
        nav_docs: "Documentation",
        nav_github: "GitHub",

        // Hero
        hero_title: "Capture The Flag<br>Multi-Agent Reinforcement Learning",
        hero_subtitle: "A project by Saliou Dieng",
        hero_description: "How AI agents learn to cooperate in teams and develop complex strategies through reinforcement learning – without explicit programming.",
        hero_cta_demo: "Watch Live Demo",
        hero_cta_stats: "Statistics",
        hero_cta_docs: "Read Documentation",

        // Challenge
        challenge_title: "The Challenge",
        challenge_subtitle: "Teaching AI agents to work together in complex, competitive environments",
        challenge_card1_title: "Multi-Agent System",
        challenge_card1_text: "Two teams of AI agents (Blue vs Red) must coordinate in real-time to capture the opponent's flag while defending their own.",
        challenge_card2_title: "Emergent Behavior",
        challenge_card2_text: "No explicit rules for teamwork. Agents learn cooperation through trial and error, discovering tactics like role allocation and strategic positioning.",
        challenge_card3_title: "Complex Environment",
        challenge_card3_text: "24x24 grid with walls, bases, and dynamic obstacles. Agents must navigate, avoid enemies, and coordinate attacks.",
        challenge_diagram_label: "Simplified view of the game environment",

        // Method
        method_title: "The Method",
        method_subtitle: "Proximal Policy Optimization with custom reward shaping",
        method_ppo_title: "Reinforcement Learning Algorithm: PPO",
        method_ppo_text: "We use Proximal Policy Optimization (PPO), a state-of-the-art policy gradient method that balances exploration and exploitation. PPO is known for its stability and sample efficiency in multi-agent environments.",
        method_ppo_code: "stable-baselines3 PPO | 100,000+ timesteps | Parallel environment training",
        method_reward_title: "Reward Function Design",
        method_reward_text: "The core of learning lies in the reward signal. Our custom reward function encourages:",
        method_reward_1: "Capturing the enemy flag",
        method_reward_2: "Moving towards enemy flag",
        method_reward_3: "Defending own flag area",
        method_reward_4: "Successfully stunning an enemy",
        method_reward_5: "Time penalty (encourages faster gameplay)",
        method_arch_title: "Training Architecture",
        method_arch_text: "PettingZoo multi-agent environment | Shared policy network | Vector observation space (grid-based vision, agent states, flag positions)",

        // Results
        results_title: "Results",
        results_subtitle: "From random chaos to coordinated tactics",
        results_phase1_label: "Phase 1: Random Chaos (Episode 0)",
        results_phase1_desc: "Agents wander aimlessly, ignoring flags and teammates. No strategic behavior emerges.",
        results_phase2_label: "Phase 2: Tactical Play (Episode 10,000+)",
        results_phase2_desc: "Agents coordinate attacks, defend strategically, and use walls for cover. Clear role division emerges.",

        // Learnings
        learnings_title: "Key Learnings",
        learnings_subtitle: "Emergent behaviors discovered through reinforcement learning",
        learnings_card1_title: "1. Pathfinding & Navigation",
        learnings_card1_text: "Agents learned to navigate around walls efficiently, discovering optimal routes to enemy territory without explicit pathfinding algorithms.",
        learnings_card2_title: "2. Role Allocation",
        learnings_card2_text: "Without being programmed to do so, agents naturally split into offensive and defensive roles, with some protecting the home base while others attack.",
        learnings_card3_title: "3. Combat Tactics",
        learnings_card3_text: "Agents developed timing strategies for using the stun ability, learning to coordinate attacks and protect flag carriers.",

        // Dashboard specific
        dashboard_title: "Training Dashboard",
        dashboard_subtitle: "Real-time analytics and performance metrics from 100,000+ training timesteps",
        dashboard_run_label: "Training Run:",
        dashboard_run_latest: "Latest Run (Beta)",
        dashboard_metric_peak: "Peak Reward",
        dashboard_metric_timesteps: "Total Timesteps",
        dashboard_metric_length: "Avg Episode Length",
        dashboard_chart_reward: "Reward Progress",
        dashboard_chart_zoom: "Scroll to zoom | Drag to pan",
        dashboard_chart_reset: "Reset Zoom",
        dashboard_chart_length: "Episode Length Evolution",
        dashboard_chart_dist: "Reward Distribution",
        dashboard_config_title: "Training Configuration",
        dashboard_hyper_title: "Hyperparameters",
        dashboard_insights_title: "Performance Insights",

        // Demo specific
        demo_step: "Step",
        demo_upload: "Upload Replay",
        demo_replays: "Available Replays",
        demo_events: "Event Log",
        demo_legend: "Legend",
        demo_blue: "Blue Team",
        demo_red: "Red Team",
        demo_flag: "Flag",

        // Footer
        footer_tech: "Built with PyTorch, Stable-Baselines3, PettingZoo, and Three.js",
        footer_copyright: "© 2025 Reinforcement Learning Research Project | Saliou Dieng"
    },

    fr: {
        // Navigation
        nav_demo: "Démo en direct",
        nav_stats: "Statistiques",
        nav_docs: "Documentation",
        nav_github: "GitHub",

        // Hero
        hero_title: "Capture The Flag<br>Apprentissage Multi-Agent par Renforcement",
        hero_subtitle: "Un projet de Saliou Dieng",
        hero_description: "Comment les agents IA apprennent à coopérer en équipe et à développer des stratégies complexes grâce à l'apprentissage par renforcement – sans programmation explicite.",
        hero_cta_demo: "Voir la démo",
        hero_cta_stats: "Statistiques",
        hero_cta_docs: "Lire la documentation",

        // Challenge
        challenge_title: "Le Défi",
        challenge_subtitle: "Apprendre aux agents IA à travailler ensemble dans des environnements complexes et compétitifs",
        challenge_card1_title: "Système Multi-Agent",
        challenge_card1_text: "Deux équipes d'agents IA (Bleu vs Rouge) doivent se coordonner en temps réel pour capturer le drapeau adverse tout en défendant le leur.",
        challenge_card2_title: "Comportement Émergent",
        challenge_card2_text: "Aucune règle explicite pour le travail d'équipe. Les agents apprennent la coopération par essais et erreurs, découvrant des tactiques comme la répartition des rôles et le positionnement stratégique.",
        challenge_card3_title: "Environnement Complexe",
        challenge_card3_text: "Grille 24x24 avec murs, bases et obstacles dynamiques. Les agents doivent naviguer, éviter les ennemis et coordonner les attaques.",
        challenge_diagram_label: "Vue simplifiée de l'environnement de jeu",

        // Method
        method_title: "La Méthode",
        method_subtitle: "Optimisation de Politique Proximale avec fonction de récompense personnalisée",
        method_ppo_title: "Algorithme d'Apprentissage par Renforcement : PPO",
        method_ppo_text: "Nous utilisons l'Optimisation de Politique Proximale (PPO), une méthode de gradient de politique state-of-the-art qui équilibre exploration et exploitation. PPO est connu pour sa stabilité et son efficacité d'échantillonnage dans les environnements multi-agents.",
        method_ppo_code: "stable-baselines3 PPO | 100 000+ timesteps | Entraînement d'environnement parallèle",
        method_reward_title: "Conception de la Fonction de Récompense",
        method_reward_text: "Le cœur de l'apprentissage réside dans le signal de récompense. Notre fonction de récompense personnalisée encourage :",
        method_reward_1: "Capturer le drapeau ennemi",
        method_reward_2: "Se déplacer vers le drapeau ennemi",
        method_reward_3: "Défendre la zone du drapeau",
        method_reward_4: "Étourdir avec succès un ennemi",
        method_reward_5: "Pénalité de temps (encourage un jeu plus rapide)",
        method_arch_title: "Architecture d'Entraînement",
        method_arch_text: "Environnement multi-agent PettingZoo | Réseau de politique partagé | Espace d'observation vectoriel (vision basée sur grille, états des agents, positions des drapeaux)",

        // Results
        results_title: "Résultats",
        results_subtitle: "Du chaos aléatoire aux tactiques coordonnées",
        results_phase1_label: "Phase 1 : Chaos Aléatoire (Épisode 0)",
        results_phase1_desc: "Les agents errent sans but, ignorant les drapeaux et les coéquipiers. Aucun comportement stratégique n'émerge.",
        results_phase2_label: "Phase 2 : Jeu Tactique (Épisode 10 000+)",
        results_phase2_desc: "Les agents coordonnent les attaques, défendent stratégiquement et utilisent les murs comme couverture. Une division claire des rôles émerge.",

        // Learnings
        learnings_title: "Principales Découvertes",
        learnings_subtitle: "Comportements émergents découverts par l'apprentissage par renforcement",
        learnings_card1_title: "1. Pathfinding & Navigation",
        learnings_card1_text: "Les agents ont appris à naviguer efficacement autour des murs, découvrant des routes optimales vers le territoire ennemi sans algorithmes de pathfinding explicites.",
        learnings_card2_title: "2. Répartition des Rôles",
        learnings_card2_text: "Sans être programmés pour le faire, les agents se sont naturellement divisés en rôles offensifs et défensifs, certains protégeant la base pendant que d'autres attaquent.",
        learnings_card3_title: "3. Tactiques de Combat",
        learnings_card3_text: "Les agents ont développé des stratégies de timing pour utiliser la capacité d'étourdissement, apprenant à coordonner les attaques et à protéger les porteurs de drapeau.",

        // Dashboard specific
        dashboard_title: "Tableau de Bord d'Entraînement",
        dashboard_subtitle: "Analyses en temps réel et métriques de performance de 100 000+ timesteps d'entraînement",
        dashboard_run_label: "Run d'Entraînement :",
        dashboard_run_latest: "Dernier Run (Beta)",
        dashboard_metric_peak: "Récompense Maximum",
        dashboard_metric_timesteps: "Timesteps Totaux",
        dashboard_metric_length: "Longueur Moyenne d'Épisode",
        dashboard_chart_reward: "Progression de la Récompense",
        dashboard_chart_zoom: "Défiler pour zoomer | Glisser pour déplacer",
        dashboard_chart_reset: "Réinitialiser le Zoom",
        dashboard_chart_length: "Évolution de la Longueur d'Épisode",
        dashboard_chart_dist: "Distribution des Récompenses",
        dashboard_config_title: "Configuration d'Entraînement",
        dashboard_hyper_title: "Hyperparamètres",
        dashboard_insights_title: "Aperçus de Performance",

        // Demo specific
        demo_step: "Étape",
        demo_upload: "Télécharger un Replay",
        demo_replays: "Replays Disponibles",
        demo_events: "Journal d'Événements",
        demo_legend: "Légende",
        demo_blue: "Équipe Bleue",
        demo_red: "Équipe Rouge",
        demo_flag: "Drapeau",

        // Footer
        footer_tech: "Créé avec PyTorch, Stable-Baselines3, PettingZoo et Three.js",
        footer_copyright: "© 2025 Projet de Recherche en Apprentissage par Renforcement | Saliou Dieng"
    }
};

// Current language (default: German)
let currentLang = localStorage.getItem('ctf-lang') || 'de';

/**
 * Translate the page
 */
function translatePage() {
    const lang = translations[currentLang];

    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (lang[key]) {
            element.innerHTML = lang[key];
        }
    });

    // Update language selector
    const selector = document.getElementById('lang-select');
    if (selector) {
        selector.value = currentLang;
    }
}

/**
 * Change language
 */
function changeLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        localStorage.setItem('ctf-lang', lang);
        translatePage();
    }
}

// Auto-translate on load
document.addEventListener('DOMContentLoaded', () => {
    translatePage();

    // Setup language selector
    const selector = document.getElementById('lang-select');
    if (selector) {
        selector.addEventListener('change', (e) => {
            changeLanguage(e.target.value);
        });
    }
});
