#!/bin/bash

echo "🚀 Starting Django Background Task Processor..."

LOG_FILE="logs/background_tasks.log"

# Create logs directory if it doesn't exist
mkdir -p logs

while true
do
    echo "🔄 Running process_tasks at $(date)" >> "$LOG_FILE"
    python manage.py process_tasks >> "$LOG_FILE" 2>&1

    echo "⚠️ Background task processor exited. Restarting in 30 seconds..." >> "$LOG_FILE"
    sleep 30
done
