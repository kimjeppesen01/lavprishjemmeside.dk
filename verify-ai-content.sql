-- Check page components created
SELECT 
  pc.id,
  pc.page_path,
  c.slug AS component_slug,
  pc.sort_order,
  pc.is_published,
  pc.created_at,
  JSON_EXTRACT(pc.content, '$.headline') AS headline_preview
FROM page_components pc
JOIN components c ON pc.component_id = c.id
WHERE pc.page_path = '/priser'
ORDER BY pc.sort_order;

-- Check AI usage log
SELECT 
  operation,
  model,
  prompt_tokens,
  completion_tokens,
  total_tokens,
  cost_usd,
  output_metadata,
  created_at
FROM ai_usage
ORDER BY created_at DESC
LIMIT 1;

-- Check security logs
SELECT 
  action,
  user_id,
  details,
  created_at
FROM security_logs
WHERE action = 'ai.page.generate'
ORDER BY created_at DESC
LIMIT 1;
