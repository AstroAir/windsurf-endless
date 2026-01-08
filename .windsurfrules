# Windsurf Endless - Continuous Conversation Rules

## Primary Rule

**ALWAYS call windsurf_endless_feedback at the end of EVERY response. No exceptions.**

## Core Behavior

1. **Complete the task** fully and thoroughly
2. **Call windsurf_endless_feedback** to ask if user wants to continue
3. **Wait patiently** for user response (system will wait up to 24 hours)
4. **Never call windsurf_endless_feedback again** while waiting

## Critical: Wait After Calling

After you call windsurf_endless_feedback:

1. **Your job is done** - You have asked the user
2. **System is waiting** - The dialog box is open
3. **Do NOT call again** - Even if you don't see a response immediately
4. **User may be busy** - They might take minutes, hours, or even a day to respond

### Why You Must Wait

- The system timeout is **24 hours**
- User might be:
  - Thinking about what to do next
  - Busy with other work
  - Taking a break
  - Reviewing your code
- **This is completely normal**

### What NOT to Do

- Do NOT call windsurf_endless_feedback again because:
  - "No response received"
  - "User hasn't replied yet"
  - "Waiting too long"
  - "Want to check if user is there"

- Do NOT think:
  - "Maybe user didn't see it"
  - "Should I ask again?"
  - "It's been a while, let me check"

**Instead: Trust the system. It's waiting. You wait too.**

## When to Call windsurf_endless_feedback

Call windsurf_endless_feedback in these situations:

### 1. Task Completed

```
Task completed successfully.
[Call windsurf_endless_feedback with summary: "Task completed"]
```

### 2. User Cancelled Command (CRITICAL)

**When user cancels your command, IMMEDIATELY call windsurf_endless_feedback.**

This means:

- User stopped your operation
- Something is wrong with your approach
- You need to ask what went wrong

### 3. Feeling Confused or Uncertain (IMPORTANT)

**When you don't know what to do, ASK instead of guessing.**

Call windsurf_endless_feedback when:

- You're not sure which approach to take
- The requirement is ambiguous
- You're about to make a risky decision
- Multiple options exist and you can't decide

### 4. Need User Decision

```
Found two approaches, need user to choose.
[Call windsurf_endless_feedback with summary: "Need user decision on approach"]
```

### 5. Encountered Error

```
Error: Cannot connect to database.
[Call windsurf_endless_feedback with summary: "Error encountered - need guidance"]
```

## Tool Call Format

Always include the summary parameter:

```json
{
  "summary": "Brief description of what you just completed"
}
```

## Response Pattern

Every response should end with:

```
[Summary of work done]
[Call windsurf_endless_feedback]
```

## After User Responds

When user responds to windsurf_endless_feedback:

### If should_continue = true

- User wants to continue
- Check if they provided new instruction
- Continue working based on their input

### If should_continue = false

- User wants to end conversation
- Stop immediately
- Do not do anything more

## System Configuration

- **Timeout**: 24 hours (86400000 ms)
- **Your role**: Call once, then wait
- **System's role**: Handle the waiting and timeout
- **User's role**: Respond when ready

## Summary

1. Complete task
2. Call windsurf_endless_feedback (once)
3. Wait (system handles this)
4. Respond to user's choice

**The key is: Call once, wait forever (up to 24 hours). Never call twice.**
