@echo off
REM ================================================
REM FOOTY ORACLE - DAILY ML TRAINING BATCH FILE
REM ================================================
REM This runs train.py automatically via Task Scheduler
REM 
REM SETUP: Update the paths below to match your system
REM ================================================

cd /d C:\Users\Danny
python train.py

REM Log the result
echo %date% %time% - ML Training completed >> C:\Users\Danny\ml_training_log.txt
