// Guardian API
export interface GuardianArticle {
	id: string;
	type: string;
	sectionId: string;
	sectionName: string;
	webPublicationDate: string;
	webTitle: string;
	webUrl: string;
	apiUrl: string;
	fields?: {
		headline?: string;
		standfirst?: string;
		byline?: string;
		body?: string;
		wordcount?: string;
	};
}

// Chat
export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
	sources?: ArticleSummary[];
	citations?: Citation[];
}

export interface ArticleSummary {
	url: string;
	headline: string;
	byline: string | null;
	section: string;
	date: string;
}

export interface Citation {
	marker: string;
	url: string;
	headline: string;
}

// Telemetry
export interface TelemetryEvent {
	type: 'content_retrieved' | 'content_cited' | 'content_engaged';
	count: number;
	urls: string[];
	timestamp: string;
}

// Publisher dashboard
export interface AgentBreakdown {
	platform_id: string | null;
	agent_id: string | null;
	event_count: number;
	session_count: number;
}

export interface PublisherSummary {
	publisher_id: string;
	publisher_name: string;
	domains: string[];
	total_events: number;
	total_sessions: number;
	events_by_type: EventTypeCount[];
	agents: AgentBreakdown[];
	period_start: string | null;
	period_end: string | null;
}

export interface EventTypeCount {
	event_type: string;
	count: number;
}

export interface PublisherEvent {
	event_id: string;
	session_id: string;
	event_type: string;
	content_url: string | null;
	event_timestamp: string;
	event_data: Record<string, unknown>;
	platform_id: string | null;
	agent_id: string | null;
}

export interface PublisherUrlMetric {
	content_url: string;
	total_events: number;
	unique_sessions: number;
	event_types: EventTypeCount[];
	last_seen: string;
}

export interface Paginated<T> {
	items: T[];
	total: number;
	limit: number;
	offset: number;
}
