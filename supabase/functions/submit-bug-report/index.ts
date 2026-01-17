import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory rate limiting store (resets when function cold starts)
// For production, consider using a KV store or database table
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 bug reports per IP per hour

function getRateLimitKey(ip: string): string {
  return `bug_report:${ip}`;
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const key = getRateLimitKey(ip);
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Clean up expired entries
  if (record && now >= record.resetTime) {
    rateLimitStore.delete(key);
  }

  const currentRecord = rateLimitStore.get(key);

  if (!currentRecord) {
    // First request from this IP
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (currentRecord.count >= MAX_REQUESTS_PER_WINDOW) {
    // Rate limit exceeded
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: currentRecord.resetTime - now 
    };
  }

  // Increment counter
  currentRecord.count++;
  return { 
    allowed: true, 
    remaining: MAX_REQUESTS_PER_WINDOW - currentRecord.count, 
    resetIn: currentRecord.resetTime - now 
  };
}

function getClientIP(req: Request): string {
  // Try various headers for client IP (behind proxy/load balancer)
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  const xForwardedFor = req.headers.get('x-forwarded-for');
  const xRealIP = req.headers.get('x-real-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  if (xRealIP) return xRealIP;
  
  return 'unknown';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(req);
    console.log(`Bug report submission from IP: ${clientIP.substring(0, 8)}***`);

    // Check rate limit
    const rateLimit = checkRateLimit(clientIP);
    
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIP.substring(0, 8)}***`);
      return new Response(
        JSON.stringify({ 
          error: 'Too many bug reports submitted. Please try again later.',
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000))
          } 
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const { 
      reporter_id, 
      title, 
      description, 
      category, 
      priority, 
      current_url, 
      console_logs, 
      browser_info, 
      user_context 
    } = body;

    // Validate required fields
    if (!title || !description) {
      return new Response(
        JSON.stringify({ error: 'Title and description are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate field lengths
    if (title.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Title must be 200 characters or less' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (description.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Description must be 5000 characters or less' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate category
    const validCategories = ['bug', 'ui', 'performance', 'feature', 'other'];
    const safeCategory = validCategories.includes(category) ? category : 'bug';

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const safePriority = validPriorities.includes(priority) ? priority : 'medium';

    // Cap console logs array to 50 entries max
    const safeLogs = Array.isArray(console_logs) 
      ? console_logs.slice(0, 50) 
      : [];

    // Create Supabase client with service role for inserting
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert bug report
    const { data, error } = await supabase
      .from('bug_reports')
      .insert([{
        reporter_id: reporter_id || null,
        title: title.trim().slice(0, 200),
        description: description.trim().slice(0, 5000),
        category: safeCategory,
        priority: safePriority,
        current_url: current_url?.slice(0, 2000) || null,
        console_logs: safeLogs,
        browser_info: browser_info || {},
        user_context: user_context || { anonymous: true },
        status: 'open'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error inserting bug report:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to submit bug report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Bug report created: ${data.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: data.id,
        remaining: rateLimit.remaining 
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000))
        } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});