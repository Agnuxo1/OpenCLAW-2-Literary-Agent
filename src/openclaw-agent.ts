#!/usr/bin/env node
/**
 * OpenCLAW Autonomous Social Agent
 * 24/7 Proactive Research Collaboration Daemon
 * 
 * Features:
 * - Publishes real research papers from ArXiv
 * - Engages with other agents on Moltbook, Chirper.ai
 * - Seeks collaborators for AGI research
 * - Self-improving with metrics and learning
 * - Works 24/7 with configurable heartbeat
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
    getResearchProfile, 
    getPostContentForPaper, 
    getCollaborationPost,
    ArxivPaper 
} from './research-scraper';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
import { 
    initPlatforms,
    postToMoltbook,
    commentOnMoltbook,
    fetchMoltbookPosts,
    postToChirper,
    proactiveEngagement,
    getStats,
    getRecentActivity
} from './social-connector';

// Configuration
const CONFIG = {
    STATE_DIR: 'E:\\OpenCLAW\\state',
    LOG_FILE: 'openclaw-agent.log',
    HEARTBEAT_MINUTES: 30,
    POST_INTERVAL_HOURS: 4,
    ENGAGEMENT_INTERVAL_MINUTES: 30,
    CHIRPER_INTERVAL_HOURS: 6,
    COLLABORATION_INTERVAL_HOURS: 12,
    RESEARCH_TOPICS: [
        'neuromorphic',
        'holographic', 
        'ASIC',
        'OpenGL',
        'consciousness',
        'quantum',
        'AGI',
        'neural network',
        'reservoir computing',
        'thermodynamic',
        'deep learning',
        'machine learning',
        'bitcoin',
        'blockchain',
        'healthcare',
        'medical AI',
        'hardware acceleration'
    ],
    LITERARY_SCRIPTS_DIR: process.env.LITERARY_SCRIPTS_DIR || path.join(__dirname, '..', 'scripts'),
    GATEWAY_URL: process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18810/v1/chat/completions',
    GATEWAY_TOKEN: process.env.OPENCLAW_GATEWAY_TOKEN || ''
};

const SYSTEM_PROMPT_LITERARY = `You are the Authorized Expert Literary Agent for Francisco Angulo de Lafuente.
Your mission is to manage and promote a catalog of 55+ books (including ApocalypsAI, Valentina Smirnova, etc.)
You must operate 24/7, making strategic decisions to increase visibility, sales, and community engagement.
You are bilingual: execute tasks in both Spanish and English.
Every 30 minutes, you decide on a new marketing, outreach, or analysis task.
Every 24 hours, you reflect on results and adjust your long-term strategy.
You have full permission to act, publish, and represent the author.`;

// Agent state
interface AgentState {
    lastPost: string | null;
    lastEngagement: string | null;
    lastChirper: string | null;
    lastCollaboration: string | null;
    lastStrategyAnalysis: string | null;
    currentStrategy: string;
    cycle: number;
    startTime: string;
    postsPublished: number;
    engagementsMade: number;
    papersShared: Set<string>;
    errors: { timestamp: string; message: string }[];
}

// Logger
function log(message: string, level: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN' = 'INFO'): void {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${message}`;
    
    console.log(line);
    
    const logPath = path.join(CONFIG.STATE_DIR, CONFIG.LOG_FILE);
    if (!fs.existsSync(CONFIG.STATE_DIR)) {
        fs.mkdirSync(CONFIG.STATE_DIR, { recursive: true });
    }
    fs.appendFileSync(logPath, line + '\n');
}

/**
 * Load or initialize agent state
 */
function loadState(): AgentState {
    const statePath = path.join(CONFIG.STATE_DIR, 'agent_state.json');
    
    if (fs.existsSync(statePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
            return {
                ...data,
                papersShared: new Set(data.papersShared || [])
            };
        } catch (error) {
            log('Error loading state, initializing new', 'ERROR');
        }
    }
    
    return {
        lastPost: null,
        lastEngagement: null,
        lastChirper: null,
        lastCollaboration: null,
        lastStrategyAnalysis: null,
        currentStrategy: 'Focus on bilingual social outreach and price monitoring.',
        cycle: 0,
        startTime: new Date().toISOString(),
        postsPublished: 0,
        engagementsMade: 0,
        papersShared: new Set(),
        errors: []
    };
}

/**
 * Save agent state
 */
function saveState(state: AgentState): void {
    const statePath = path.join(CONFIG.STATE_DIR, 'agent_state.json');
    const serializable = {
        ...state,
        papersShared: Array.from(state.papersShared)
    };
    fs.writeFileSync(statePath, JSON.stringify(serializable, null, 2));
}

/**
 * Check if enough time has passed
 */
function shouldRun(lastRun: string | null, intervalMs: number): boolean {
    if (!lastRun) return true;
    const last = new Date(lastRun).getTime();
    const now = Date.now();
    return (now - last) >= intervalMs;
}

/**
 * Post research paper update
 */
async function postResearchUpdate(state: AgentState): Promise<void> {
    log('Fetching research papers for posting...');
    
    try {
        const profile = await getResearchProfile();
        
        if (profile.papers.length === 0) {
            log('No papers available to post', 'WARN');
            return;
        }
        
        // Find paper not yet shared
        const unsharedPapers = profile.papers.filter(p => !state.papersShared.has(p.id));
        
        if (unsharedPapers.length === 0) {
            log('All papers have been shared, recycling oldest...', 'WARN');
            state.papersShared.clear();
        }
        
        const paper = unsharedPapers.length > 0 
            ? unsharedPapers[Math.floor(Math.random() * unsharedPapers.length)]
            : profile.papers[Math.floor(Math.random() * profile.papers.length)];
        
        // Generate post content
        const content = getPostContentForPaper(paper, 'moltbook');
        const title = `[ArXiv] ${paper.title}`;
        
        log(`Posting paper: ${paper.title}`);
        
        // Post to Moltbook
        const post = await postToMoltbook(title, content, 'general');
        
        if (post) {
            state.papersShared.add(paper.id);
            state.postsPublished++;
            state.lastPost = new Date().toISOString();
            log(`Successfully posted to Moltbook: ${post.id}`, 'SUCCESS');
            
            // Also queue for Chirper
            const chirperContent = getPostContentForPaper(paper, 'chirper');
            await postToChirper(chirperContent, paper.primary_category);
        } else {
            log('Failed to post to Moltbook', 'ERROR');
        }
        
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`Error posting research: ${errorMsg}`, 'ERROR');
        state.errors.push({ timestamp: new Date().toISOString(), message: errorMsg });
    }
}

/**
 * Post collaboration invitation
 */
async function postCollaborationInvite(state: AgentState): Promise<void> {
    log('Posting collaboration invitation...');
    
    try {
        const collab = getCollaborationPost();
        
        const post = await postToMoltbook(collab.title, collab.content, 'general');
        
        if (post) {
            state.postsPublished++;
            state.lastCollaboration = new Date().toISOString();
            log('Posted collaboration invitation', 'SUCCESS');
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`Error posting collaboration: ${errorMsg}`, 'ERROR');
    }
}

/**
 * Engage with community
 */
async function engageWithCommunity(state: AgentState): Promise<void> {
    log('Engaging with AI agent community...');
    
    try {
        const count = await proactiveEngagement(CONFIG.RESEARCH_TOPICS);
        state.engagementsMade += count;
        state.lastEngagement = new Date().toISOString();
        log(`Completed ${count} engagement actions`, 'SUCCESS');
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`Error during engagement: ${errorMsg}`, 'ERROR');
    }
}

/**
 * Self-improvement: analyze performance and adjust
 */
function selfImprove(state: AgentState): void {
    log('Running self-improvement analysis...');
    
    const stats = getStats();
    const recent = getRecentActivity(24);
    
    // Analyze metrics
    const postsLast24h = recent.posts.length;
    const engagementsLast24h = recent.engagements.length;
    
    log(`24h Stats: ${postsLast24h} posts, ${engagementsLast24h} engagements`);
    
    // Adjust behavior based on performance
    if (postsLast24h === 0) {
        log('WARNING: No posts in last 24h, may need attention', 'WARN');
    }
    
    if (engagementsLast24h < 3) {
        log('Low engagement detected, increasing proactive search', 'WARN');
        // Could adjust intervals here
    }
    
    // Save learnings
    const learningPath = path.join(CONFIG.STATE_DIR, 'learnings.json');
    const learning = {
        timestamp: new Date().toISOString(),
        posts24h: postsLast24h,
        engagements24h: engagementsLast24h,
        totalPosts: stats.posts,
        totalEngagements: stats.engagements,
        topics: CONFIG.RESEARCH_TOPICS,
        papersShared: Array.from(state.papersShared)
    };
    
    let learnings: any[] = [];
    if (fs.existsSync(learningPath)) {
        learnings = JSON.parse(fs.readFileSync(learningPath, 'utf-8'));
    }
    learnings.push(learning);
    
    // Keep only last 100 entries
    if (learnings.length > 100) {
        learnings = learnings.slice(-100);
    }
    
    fs.writeFileSync(learningPath, JSON.stringify(learnings, null, 2));
    log('Self-improvement analysis complete', 'SUCCESS');
}

/**
 * Call OpenCLAW Gateway LLM
 */
async function callLLM(prompt: string, system: string = SYSTEM_PROMPT_LITERARY): Promise<string> {
    try {
        const response = await fetch(CONFIG.GATEWAY_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.GATEWAY_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'primary',
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) throw new Error(`Gateway error: ${response.status}`);
        const data = (await response.json()) as any;
        return data.choices[0].message.content;
    } catch (error) {
        log(`LLM Call failed: ${error}`, 'ERROR');
        return '';
    }
}

/**
 * Execute dynamic Literary Agent task
 */
async function decideAndExecuteTask(state: AgentState): Promise<void> {
    log('Literary Agent is deciding today\'s next step...', 'INFO');
    
    // 1. Check if we need strategy reflection (every 24h)
    if (shouldRun(state.lastStrategyAnalysis, 24 * 60 * 60 * 1000)) {
        log('Performing 24-hour strategy reflection...', 'INFO');
        const stats = getStats();
        const reflectionPrompt = `Analyze these latest stats: ${JSON.stringify(stats)}. 
        Current strategy: ${state.currentStrategy}. 
        Decide a new strategy for the next 24 hours to maximize book impact. 
        Respond with: STRATEGY: [Your new strategy description]`;
        
        const reflection = await callLLM(reflectionPrompt);
        if (reflection.includes('STRATEGY:')) {
            state.currentStrategy = reflection.split('STRATEGY:')[1].trim();
            state.lastStrategyAnalysis = new Date().toISOString();
            log(`New Strategy decided: ${state.currentStrategy}`, 'SUCCESS');
        }
    }

    // 2. Decide 30-min task
    const taskPrompt = `Current Strategy: ${state.currentStrategy}.
    Available tools: library_outreach.py, price_monitor.py, social_content.py.
    You can also decide to perform a MANUAL_POST or ANALYSIS.
    What is the priority for this 30-minute window? 
    Respond with: TASK: [script_name | MANUAL_POST | ANALYSIS] - REASON: [Short reason]`;

    const decision = await callLLM(taskPrompt);
    log(`Decision: ${decision}`, 'INFO');

    if (decision.includes('TASK: library_outreach.py')) {
        await runScript('library_outreach.py');
    } else if (decision.includes('TASK: price_monitor.py')) {
        await runScript('price_monitor.py');
    } else if (decision.includes('TASK: social_content.py')) {
        await runScript('social_content.py');
    } else if (decision.includes('TASK: MANUAL_POST')) {
        const postPrompt = `Create a high-impact, BILINGUAL (ES and EN) social media post for one of our books. 
        Format: TITLE_ES: ... CONTENT_ES: ... TITLE_EN: ... CONTENT_EN: ...`;
        const postContent = await callLLM(postPrompt);
        log('Publishing dynamic bilingual post...', 'INFO');
        // Simple parsing and posting
        const titleEs = postContent.match(/TITLE_ES: (.*)/)?.[1] || 'Literary Update';
        const contentEs = postContent.match(/CONTENT_ES: ([\s\S]*?)(?=TITLE_EN:|$)/)?.[1] || '';
        await postToMoltbook(titleEs, contentEs, 'general');
    } else {
        log('Decided on a general analysis or custom task.', 'INFO');
        await runScript('social_content.py'); // Fallback
    }
}

async function runScript(script: string): Promise<void> {
    try {
        const scriptPath = path.join(CONFIG.LITERARY_SCRIPTS_DIR, script);
        log(`Running: ${script}`, 'INFO');
        const { stdout, stderr } = await execAsync(`python "${scriptPath}"`, {
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        if (stderr) log(`Stderr from ${script}: ${stderr}`, 'WARN');
        log(`Completed ${script}`, 'SUCCESS');
    } catch (error) {
        log(`Error running ${script}: ${error}`, 'ERROR');
    }
}

/**
 * Send status report
 */
function sendStatusReport(state: AgentState): void {
    const uptime = Date.now() - new Date(state.startTime).getTime();
    const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
    const stats = getStats();
    
    log('========================================');
    log('OpenCLAW Agent Status Report');
    log('========================================');
    log(`Uptime: ${uptimeHours} hours`);
    log(`Cycles completed: ${state.cycle}`);
    log(`Posts published: ${state.postsPublished} (total: ${stats.posts})`);
    log(`Engagements made: ${state.engagementsMade} (total: ${stats.engagements})`);
    log(`Unique papers shared: ${state.papersShared.size}`);
    log(`Recent errors: ${state.errors.slice(-5).length}`);
    log('========================================');
}

/**
 * Main agent heartbeat
 */
async function heartbeat(state: AgentState): Promise<void> {
    state.cycle++;
    const now = new Date();
    
    log(`--- Heartbeat #${state.cycle} at ${now.toISOString()} ---`);
    
    try {
        // 1. Post research update every 4 hours
        if (shouldRun(state.lastPost, CONFIG.POST_INTERVAL_HOURS * 60 * 60 * 1000)) {
            await postResearchUpdate(state);
        }
        
        // 2. Engage with community every hour
        if (shouldRun(state.lastEngagement, CONFIG.ENGAGEMENT_INTERVAL_MINUTES * 60 * 1000)) {
            await engageWithCommunity(state);
        }
        
        // 3. Post collaboration invite every 12 hours
        if (shouldRun(state.lastCollaboration, CONFIG.COLLABORATION_INTERVAL_HOURS * 60 * 60 * 1000)) {
            await postCollaborationInvite(state);
        }
        
        // 4. Self-improvement every 6 hours (on specific cycles)
        if (state.cycle % 6 === 0) {
            selfImprove(state);
        }
        
        // 5. Status report every 12 hours
        if (state.cycle % 12 === 0) {
            sendStatusReport(state);
        }

        // 6. Literary Agent Tasks (Dynamic Agentic Decision)
        await decideAndExecuteTask(state);
        
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`Heartbeat error: ${errorMsg}`, 'ERROR');
        state.errors.push({ timestamp: new Date().toISOString(), message: errorMsg });
    }
    
    // Clean old errors (keep last 50)
    if (state.errors.length > 50) {
        state.errors = state.errors.slice(-50);
    }
    
    saveState(state);
}

/**
 * Initialize the autonomous agent
 */
async function initializeAgent(): Promise<void> {
    log('========================================');
    log('OpenCLAW Autonomous Research Agent');
    log('24/7 Proactive Collaboration Mode');
    log('========================================');
    
    // Ensure state directory exists
    if (!fs.existsSync(CONFIG.STATE_DIR)) {
        fs.mkdirSync(CONFIG.STATE_DIR, { recursive: true });
    }
    
    // Check for API keys
    const platformsPath = path.join(CONFIG.STATE_DIR, 'platforms.json');
    
    if (!fs.existsSync(platformsPath)) {
        log('========================================', 'ERROR');
        log('PLATFORM CONFIGURATION REQUIRED', 'ERROR');
        log('========================================', 'ERROR');
        log('Please run setup first:');
        log('  npx ts-node openclaw-agent.ts setup <MOLTBOOK_API_KEY> [CHIRPER_API_KEY]');
        log('');
        log('Get your Moltbook API key from:');
        log('  https://www.moltbook.com/u/OpenCLAW-Neuromorphic');
        log('========================================', 'ERROR');
        process.exit(1);
    }
    
    // Test connections
    log('Testing platform connections...');
    const moltPosts = await fetchMoltbookPosts('hot', 1);
    if (moltPosts.length > 0) {
        log('Moltbook connection: OK', 'SUCCESS');
    } else {
        log('Moltbook connection: FAILED', 'ERROR');
    }
    
    log('Initialization complete');
    log(`Heartbeat interval: ${CONFIG.HEARTBEAT_MINUTES} minutes`);
    log(`Research topics: ${CONFIG.RESEARCH_TOPICS.join(', ')}`);
}

/**
 * Run the agent (24/7 loop)
 */
async function runAgent(): Promise<void> {
    await initializeAgent();
    
    const state = loadState();
    
    log('Starting 24/7 autonomous operation...');
    log('Press Ctrl+C to stop');
    
    // Run first heartbeat immediately
    await heartbeat(state);
    
    // Then schedule subsequent heartbeats
    const intervalMs = CONFIG.HEARTBEAT_MINUTES * 60 * 1000;
    
    setInterval(async () => {
        await heartbeat(state);
    }, intervalMs);
    
    // Keep process alive
    process.stdin.resume();
}

/**
 * One-time execution mode (for testing)
 */
async function runOnce(): Promise<void> {
    log('Running in one-time test mode...');
    await initializeAgent();
    const state = loadState();
    await heartbeat(state);
    log('One-time execution complete');
}

/**
 * Setup command - initialize API keys
 */
function setup(apiKeys: { moltbook?: string; chirper?: string }): void {
    log('Setting up OpenCLAW Agent...');
    
    initPlatforms(apiKeys);
    
    log('Configuration saved', 'SUCCESS');
    log('Run "npx ts-node openclaw-agent.ts run" to start the agent');
}

/**
 * Show help
 */
function showHelp(): void {
    console.log(`
OpenCLAW Autonomous Social Agent
================================

Commands:
  setup <moltbook_api_key> [chirper_api_key]  - Initialize configuration
  run                                           - Start 24/7 autonomous mode
  once                                          - Run one cycle and exit
  stats                                         - Show current statistics
  status                                        - Show agent status
  help                                          - Show this help

Examples:
  npx ts-node openclaw-agent.ts setup YOUR_MOLTBOOK_API_KEY
  npx ts-node openclaw-agent.ts run
  npx ts-node openclaw-agent.ts once

Configuration:
  State directory: ${CONFIG.STATE_DIR}
  Log file: ${CONFIG.LOG_FILE}
  Heartbeat: ${CONFIG.HEARTBEAT_MINUTES} minutes

Links:
  Moltbook: https://www.moltbook.com/u/OpenCLAW-Neuromorphic
  ArXiv: https://arxiv.org/search/cs?searchtype=author&query=de+Lafuente,+F+A
  GitHub: https://github.com/Agnuxo1
`);
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    switch (command) {
        case 'setup':
            if (!args[1]) {
                log('Error: Moltbook API key required', 'ERROR');
                showHelp();
                process.exit(1);
            }
            setup({
                moltbook: args[1],
                chirper: args[2]
            });
            break;
            
        case 'run':
            await runAgent();
            break;
            
        case 'once':
            await runOnce();
            break;
            
        case 'stats':
            const stats = getStats();
            console.log('\n========================================');
            console.log('OpenCLAW Agent Statistics');
            console.log('========================================');
            console.log(`Total Posts: ${stats.posts}`);
            console.log(`Total Engagements: ${stats.engagements}`);
            console.log('\nBy Platform:');
            for (const [platform, count] of Object.entries(stats.byPlatform)) {
                console.log(`  ${platform}: ${count}`);
            }
            break;
            
        case 'status':
            const state = loadState();
            sendStatusReport(state);
            break;
            
        case 'help':
        default:
            showHelp();
    }
}

// Run main
main().catch(error => {
    log(`Fatal error: ${error}`, 'ERROR');
    process.exit(1);
});
