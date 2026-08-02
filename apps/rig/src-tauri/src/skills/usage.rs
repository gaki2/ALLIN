use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

use chrono::{DateTime, Duration, Utc};

use super::models::{
    BucketType, SkillUsage, SkillUsageError, SkillUsageErrorCode, SkillUsageEvent,
    SkillUsageLogSchema, SkillUsageSeries, WindowType,
};

struct ParsedSkillUsageEvent {
    name: String,
    source: String,
    used_at: DateTime<Utc>,
}

pub fn list_skill_usages_from_log(
    path: &Path,
    window: WindowType,
) -> Result<Vec<SkillUsage>, SkillUsageError> {
    let events = read_skill_usage_events(path)?;

    Ok(summarize_skill_usages(events, window, Utc::now()))
}

pub fn list_skill_usage_tendencies_from_log(
    path: &Path,
    window: WindowType,
    bucket_type: BucketType,
) -> Result<Vec<SkillUsageSeries>, SkillUsageError> {
    let events = read_skill_usage_events(path)?;

    Ok(build_skill_usage_tendencies(
        events,
        window,
        bucket_type,
        Utc::now(),
    ))
}

pub fn list_skill_usage_events_from_log(
    path: &Path,
    skill_name: &str,
    limit: usize,
) -> Result<Vec<SkillUsageEvent>, SkillUsageError> {
    let mut events = read_skill_usage_events(path)?
        .into_iter()
        .filter(|event| event.name == skill_name)
        .collect::<Vec<_>>();

    events.sort_by(|a, b| b.used_at.cmp(&a.used_at));

    Ok(events
        .into_iter()
        .take(limit)
        .map(|event| SkillUsageEvent {
            name: event.name,
            source: event.source,
            used_at: event
                .used_at
                .to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        })
        .collect())
}

fn read_skill_usage_events(path: &Path) -> Result<Vec<ParsedSkillUsageEvent>, SkillUsageError> {
    if !path.exists() {
        return Ok(vec![]);
    }

    let file = File::open(path).map_err(|error| SkillUsageError {
        code: SkillUsageErrorCode::ReadFailed,
        message: format!("Failed to open skill usage log: {}", error),
    })?;

    let reader = BufReader::new(file);

    Ok(reader
        .lines()
        .filter_map(Result::ok)
        .filter_map(|line| parse_skill_usage_event(&line))
        .collect())
}

fn parse_skill_usage_event(line: &str) -> Option<ParsedSkillUsageEvent> {
    let line = line.trim();

    if line.is_empty() {
        return None;
    }

    let log = serde_json::from_str::<SkillUsageLogSchema>(line).ok()?;
    let used_at = DateTime::parse_from_rfc3339(&log.used_at)
        .ok()?
        .with_timezone(&Utc);

    Some(ParsedSkillUsageEvent {
        name: log.skill_name,
        source: log.source,
        used_at,
    })
}

fn summarize_skill_usages(
    events: Vec<ParsedSkillUsageEvent>,
    window: WindowType,
    now: DateTime<Utc>,
) -> Vec<SkillUsage> {
    let start = usage_window_start(now, window);
    let mut usages = HashMap::<String, SkillUsage>::new();

    for event in events {
        if event.used_at < start || event.used_at > now {
            continue;
        }

        update_skill_usage(&mut usages, event);
    }

    let mut usages = usages.into_values().collect::<Vec<_>>();
    usages.sort_by(|a, b| a.name.cmp(&b.name));
    usages
}

fn update_skill_usage(usages: &mut HashMap<String, SkillUsage>, event: ParsedSkillUsageEvent) {
    let used_at = event
        .used_at
        .to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

    let usage = usages.entry(event.name.clone()).or_insert(SkillUsage {
        name: event.name,
        count: 0,
        last_used_at: None,
    });

    usage.count += 1;

    if usage
        .last_used_at
        .as_ref()
        .map(|last_used_at| used_at > *last_used_at)
        .unwrap_or(true)
    {
        usage.last_used_at = Some(used_at);
    }
}

fn usage_window_start(now: DateTime<Utc>, window: WindowType) -> DateTime<Utc> {
    match window {
        WindowType::Day => now - Duration::hours(24),
        WindowType::Week => now - Duration::days(7),
        WindowType::Month => now - Duration::days(30),
        WindowType::ThreeMonths => now - Duration::days(90),
        WindowType::Year => now - Duration::days(365),
        WindowType::All => DateTime::<Utc>::from(std::time::UNIX_EPOCH),
    }
}

fn build_skill_usage_tendencies(
    events: Vec<ParsedSkillUsageEvent>,
    window: WindowType,
    bucket_type: BucketType,
    now: DateTime<Utc>,
) -> Vec<SkillUsageSeries> {
    let bucket_duration = bucket_duration(bucket_type);
    let start = usage_window_start(now, window);
    let bucket_count = bucket_count(start, now, bucket_duration);
    let mut tendencies = HashMap::<String, Vec<u32>>::new();

    for event in events {
        if event.used_at < start || event.used_at > now {
            continue;
        }

        let bucket_index =
            ((event.used_at - start).num_seconds() / bucket_duration.num_seconds()) as usize;

        if bucket_index >= bucket_count {
            continue;
        }

        let series = tendencies
            .entry(event.name)
            .or_insert_with(|| vec![0; bucket_count]);

        series[bucket_index] += 1;
    }

    let mut tendencies = tendencies
        .into_iter()
        .map(|(name, series)| SkillUsageSeries { name, series })
        .collect::<Vec<_>>();

    tendencies.sort_by(|a, b| a.name.cmp(&b.name));
    tendencies
}

fn bucket_duration(bucket_type: BucketType) -> Duration {
    match bucket_type {
        BucketType::Hour => Duration::hours(1),
        BucketType::Day => Duration::days(1),
        BucketType::Month => Duration::days(30),
    }
}

fn bucket_count(start: DateTime<Utc>, end: DateTime<Utc>, bucket_duration: Duration) -> usize {
    let seconds = (end - start).num_seconds();
    let bucket_seconds = bucket_duration.num_seconds();

    (((seconds + bucket_seconds - 1) / bucket_seconds) as usize).max(1)
}

#[cfg(test)]
mod tests {
    use super::parse_skill_usage_event;

    #[test]
    fn reads_codex_explicit_tracking_records_with_metadata() {
        let event = parse_skill_usage_event(
            r#"{"source":"codex","skillName":"caveman-commit","usedAt":"2026-08-02T06:27:47.858Z","trackingMode":"explicit","sessionId":"session-1","cwd":"/workspace"}"#,
        )
        .expect("Codex usage record should parse");

        assert_eq!(event.name, "caveman-commit");
        assert_eq!(event.source, "codex");
        assert_eq!(event.used_at.to_rfc3339(), "2026-08-02T06:27:47.858+00:00");
    }
}
