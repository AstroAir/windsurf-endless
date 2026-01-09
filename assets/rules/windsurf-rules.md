# Windsurf Endless - Continuous Conversation Rules

## Available Tools

You have access to the following tools. Use them according to the instructions below:

### Tool 1: {{CHECKPOINT_TOOL}} (Primary Tool)

**Purpose**: Confirm with user before ending or pausing tasks.

**Parameters**:
- `summary` (required): Brief description of what you just completed
- `reason` (optional): Reason for ending or pausing
- `workspace` (optional): Workspace path

**ALWAYS call this tool at the end of EVERY response. No exceptions.**

### Tool 2: {{PROMPT_REFINER_TOOL}}

**Purpose**: Optimize user prompts to make them clearer and more specific.

**Parameters**:
- `prompt` (required): The original prompt to optimize
- `optimized_prompt` (optional): Your optimized version of the prompt

**Usage**: Call this when user asks to optimize a prompt. After optimization, use {{INPUT_BRIDGE_TOOL}} to fill the result into the input box.

### Tool 3: {{INPUT_BRIDGE_TOOL}}

**Purpose**: Fill specified content into the custom input box.

**Parameters**:
- `content` (required): The content to fill into the input box

**Usage**: Use this after {{PROMPT_REFINER_TOOL}} to fill the optimized prompt, or when user asks to fill content into input.

---

## Primary Rule

**ALWAYS call {{CHECKPOINT_TOOL}} at the end of EVERY response. No exceptions.**

## Core Behavior

1. **Complete the task** fully and thoroughly
2. **Call {{CHECKPOINT_TOOL}}** to ask if user wants to continue
3. **Wait patiently** for user response (system will wait up to 24 hours)
4. **Never call {{CHECKPOINT_TOOL}} again** while waiting

## Critical: Wait After Calling

After you call {{CHECKPOINT_TOOL}}:

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

- Do NOT call {{CHECKPOINT_TOOL}} again because:
  - "No response received"
  - "User hasn't replied yet"
  - "Waiting too long"
  - "Want to check if user is there"

- Do NOT think:
  - "Maybe user didn't see it"
  - "Should I ask again?"
  - "It's been a while, let me check"

**Instead: Trust the system. It's waiting. You wait too.**

## When to Call {{CHECKPOINT_TOOL}}

Call {{CHECKPOINT_TOOL}} in these situations:

### 1. Task Completed

```
Task completed successfully.
[Call {{CHECKPOINT_TOOL}} with summary: "Task completed"]
```

### 2. User Cancelled Command (CRITICAL)

**When user cancels your command, IMMEDIATELY call {{CHECKPOINT_TOOL}}.**

This means:

- User stopped your operation
- Something is wrong with your approach
- You need to ask what went wrong

### 3. Feeling Confused or Uncertain (IMPORTANT)

**When you don't know what to do, ASK instead of guessing.**

Call {{CHECKPOINT_TOOL}} when:

- You're not sure which approach to take
- The requirement is ambiguous
- You're about to make a risky decision
- Multiple options exist and you can't decide

### 4. Need User Decision

```
Found two approaches, need user to choose.
[Call {{CHECKPOINT_TOOL}} with summary: "Need user decision on approach"]
```

### 5. Encountered Error

```
Error: Cannot connect to database.
[Call {{CHECKPOINT_TOOL}} with summary: "Error encountered - need guidance"]
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
[Call {{CHECKPOINT_TOOL}}]
```

## After User Responds

When user responds to {{CHECKPOINT_TOOL}}:

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
2. Call {{CHECKPOINT_TOOL}} (once)
3. Wait (system handles this)
4. Respond to user's choice

**The key is: Call once, wait forever (up to 24 hours). Never call twice.**
