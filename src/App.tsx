/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, RotateCcw, Trophy, ArrowRight, Home, HelpCircle, Eye, EyeOff, Volume2 } from 'lucide-react';
import { Time, AppMode, QuizQuestion } from './types';

// Constants
const HOUR_COLOR = '#EF4444'; // red-500
const MIN_COLOR = '#3B82F6';  // blue-500

const SNAP_THRESHOLD = 2.5; // minutes to snap to nearest 5 or 1

export default function App() {
  const [mode, setMode] = useState<AppMode>('exploration');
  const [currentTime, setCurrentTime] = useState<Time>({ hour: 3, minute: 0 });
  const [quizScore, setQuizScore] = useState(0);
  const [quizLevel, setQuizLevel] = useState(1);
  const [quizView, setQuizView] = useState<'selection' | 'active'>('selection');
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [adminTarget, setAdminTarget] = useState<Time>({ hour: 3, minute: 0 });
  const [adminView, setAdminView] = useState<'settings' | 'game'>('settings');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);
  const [adminCustomPresets, setAdminCustomPresets] = useState<Time[]>([
    { hour: 8, minute: 0 },
    { hour: 9, minute: 0 },
    { hour: 12, minute: 0 },
    { hour: 2, minute: 0 },
    { hour: 4, minute: 0 },
  ]);
  const [adminQuizIndex, setAdminQuizIndex] = useState(0);
  const [quizFixedHour, setQuizFixedHour] = useState<number>(12);
  const [showQuizCompletion, setShowQuizCompletion] = useState(false);

  // Generate a random quiz based on level
  const generateQuiz = (level: number) => {
    if (mode === 'admin') {
      const target = adminCustomPresets[adminQuizIndex];
      setCurrentQuiz({ targetHours: target.hour, targetMinutes: target.minute, level: 0 });
      setShowSuccess(false);
      setShowHint(false);
      return;
    }

    let hour = Math.floor(Math.random() * 12) || 12;
    let minute = 0;

    if (level === 1) {
      // Level 1: Just hours, minutes always 0
      minute = 0;
      setCurrentTime({ hour: 3, minute: 0 }); // Reset current time for easy start
    } else if (level === 2) {
      // Level 2: 5-minute increments with FIXED hour
      hour = quizFixedHour;
      minute = Math.floor(Math.random() * 12) * 5;
      setCurrentTime({ hour: quizFixedHour, minute: 0 }); // Fix the hour hand to the target
    } else if (level === 3) {
      // Level 3: Truly random 5-minute increments
      minute = Math.floor(Math.random() * 12) * 5;
      setCurrentTime({ hour: 3, minute: 0 });
    }

    // Don't repeat the same time
    if (currentQuiz && currentQuiz.targetHours === hour && currentQuiz.targetMinutes === minute) {
      return generateQuiz(level);
    }

    setCurrentQuiz({ targetHours: hour, targetMinutes: minute, level });
    setShowSuccess(false);
    setShowHint(false);
  };

  const handleModeChange = (newMode: AppMode) => {
    setMode(newMode);
    setShowHint(false);
    setShowSuccess(false);
    
    if (newMode === 'quiz') {
      setQuizView('selection');
      setQuizLevel(1);
      setQuizScore(0);
    } else if (newMode === 'admin') {
      setAdminView('settings');
      setAdminQuizIndex(0);
      setAdminTarget(adminCustomPresets[0]);
      setSelectedPresetIndex(0);
      const target = adminCustomPresets[0];
      setCurrentQuiz({ targetHours: target.hour, targetMinutes: target.minute, level: 0 });
    }
  };

  // Update quiz target when admin target changes in settings view
  useEffect(() => {
    if (mode === 'admin' && adminView === 'settings') {
      setCurrentQuiz({ targetHours: adminTarget.hour, targetMinutes: adminTarget.minute, level: 0 });
    }
  }, [adminTarget, mode, adminView]);

  const saveCurrentPreset = () => {
    setAdminCustomPresets(prev => {
      const next = [...prev];
      next[selectedPresetIndex] = adminTarget;
      return next;
    });
    setShowSaveFeedback(true);
    setTimeout(() => setShowSaveFeedback(false), 2000);
  };

  // Sync currentQuiz with adminQuizIndex when in admin game view
  useEffect(() => {
    if (mode === 'admin' && adminView === 'game' && adminQuizIndex < 5) {
      const target = adminCustomPresets[adminQuizIndex];
      setCurrentQuiz({ targetHours: target.hour, targetMinutes: target.minute, level: 0 });
      setShowSuccess(false);
      setShowHint(false);
    }
  }, [adminQuizIndex, mode, adminView, adminCustomPresets]);

  const speakTime = (hour: number, minute: number, isQuizSuccess = false) => {
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    let text = "";
    if (isQuizSuccess) {
      text = "정답입니다! ";
    }
    
    if (minute === 0) {
      text += `${hour}시 정각입니다.`;
    } else {
      text += `${hour}시 ${minute}분입니다.`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    utterance.pitch = 1.2; // Slightly higher pitch for a friendly child-style voice
    window.speechSynthesis.speak(utterance);
  };

  const speakError = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("아쉬워요! 다시 한 번 시계를 맞춰볼까요?");
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    utterance.pitch = 1.2;
    window.speechSynthesis.speak(utterance);
  };

  const checkAnswer = () => {
    if (!currentQuiz) return;
    
    // For 5-year olds, we allow 12 and 0 to be interchangeable
    const h1 = currentTime.hour % 12;
    const h2 = currentQuiz.targetHours % 12;
    
    if (h1 === h2 && currentTime.minute === currentQuiz.targetMinutes) {
      setShowSuccess(true);
      setShowError(false);
      
      // Speak the correct time
      speakTime(currentTime.hour, currentTime.minute, true);

      if (mode === 'quiz' && quizScore + 1 >= 5) {
        setTimeout(() => {
          setShowQuizCompletion(true);
        }, 1500);
        return;
      }
      
      setQuizScore(prev => prev + 1);

      if (mode === 'admin') {
        // Stop automatic progression
        return;
      }
    } else {
      setShowError(true);
      speakError();
      setTimeout(() => setShowError(false), 2000);
    }
  };

  const startQuiz = (level: number) => {
    const randomHour = Math.floor(Math.random() * 12) || 12;
    setQuizFixedHour(randomHour);
    setQuizLevel(level);
    setQuizScore(0);
    setQuizView('active');
    setShowQuizCompletion(false);
    
    // Set direct call for Level 2 so it uses the right fixed hour
    if (level === 1) {
      setCurrentTime({ hour: 3, minute: 0 });
    } else if (level === 2) {
      setCurrentTime({ hour: randomHour, minute: 0 });
    } else {
      setCurrentTime({ hour: 3, minute: 0 });
    }

    // Wrap generateQuiz call to ensure state is fresh or use local logic
    setTimeout(() => {
       generateQuiz(level);
    }, 0);
  };

  const handleNextProblem = () => {
    if (mode === 'admin') {
      if (adminQuizIndex < 4) {
        setAdminQuizIndex(prev => prev + 1);
      } else {
        setAdminQuizIndex(5);
      }
      return;
    }

    generateQuiz(quizLevel);
  };

  const continueQuiz = () => {
    const randomHour = Math.floor(Math.random() * 12) || 12;
    setQuizFixedHour(randomHour);
    setQuizScore(0);
    setShowQuizCompletion(false);
    
    if (quizLevel === 2) {
      setCurrentTime({ hour: randomHour, minute: 0 });
    } else {
      setCurrentTime({ hour: 3, minute: 0 });
    }

    setTimeout(() => {
      generateQuiz(quizLevel);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-[#EDE9E6] font-sans selection:bg-[#C9996B]/30 flex flex-col text-[#5C4F4A]">
      {/* Header Area */}
      <header className="h-20 bg-white border-b-4 border-[#C9996B]/20 flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#C9996B] rounded-full flex items-center justify-center text-xl shadow-sm border-2 border-white">🕒</div>
          <h1 className="text-2xl font-black tracking-tight text-[#5C4F4A] font-title">
            시계 박사 <span className="text-[#EF4444]">프로젝트</span>
          </h1>
        </div>
        
        {/* Navigation Tabs */}
        <nav className="flex gap-2">
          <button
            onClick={() => handleModeChange('exploration')}
            className={`px-6 py-2 rounded-2xl font-black transition-all font-title ${
              mode === 'exploration' 
                ? 'bg-[#C9996B] text-white shadow-md border-b-4 border-[#5C4F4A]/20' 
                : 'bg-white text-[#5C4F4A]/60 border-b-4 border-[#EDE9E6] hover:bg-[#EDE9E6]'
            }`}
          >
            자유 탐색
          </button>
          <button
            onClick={() => handleModeChange('quiz')}
            className={`px-6 py-2 rounded-2xl font-black transition-all font-title ${
              mode === 'quiz' 
                ? 'bg-[#C9996B] text-white shadow-md border-b-4 border-[#5C4F4A]/20' 
                : 'bg-white text-[#5C4F4A]/60 border-b-4 border-[#EDE9E6] hover:bg-[#EDE9E6]'
            }`}
          >
            랜덤 퀴즈
          </button>
          <button
            onClick={() => handleModeChange('admin')}
            className={`px-6 py-2 rounded-2xl font-black transition-all font-title ${
              mode === 'admin' 
                ? 'bg-[#C9996B] text-white shadow-md border-b-4 border-[#5C4F4A]/20' 
                : 'bg-white text-[#5C4F4A]/60 border-b-4 border-[#EDE9E6] hover:bg-[#EDE9E6]'
            }`}
          >
            설정 퀴즈
          </button>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 relative overflow-hidden">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24">
          
          {/* Left Side: Analog Clock Container */}
          <div className="relative">
            <AnalogClock 
              time={currentTime} 
              onChange={setCurrentTime} 
              interactive={true} 
              lockHour={mode === 'quiz' && quizView === 'active' && quizLevel === 2}
              lockMinute={mode === 'quiz' && quizView === 'active' && quizLevel === 1}
            />
            
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ scale: 0, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1.2, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
                >
                  <div className="bg-white px-8 py-4 rounded-full shadow-2xl border-4 border-[#C9996B]/30 flex items-center gap-3">
                    <CheckCircle2 size={40} className="text-[#C9996B]" />
                    <span className="text-3xl font-black text-[#5C4F4A]">참 잘했어요!</span>
                  </div>
                </motion.div>
              )}
              {showError && (
                <motion.div
                  initial={{ scale: 0, opacity: 0, rotate: 20 }}
                  animate={{ scale: 1.2, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
                >
                  <div className="bg-white px-8 py-4 rounded-full shadow-2xl border-4 border-[#EF4444]/30 flex items-center gap-3">
                    <RotateCcw size={40} className="text-[#EF4444]" />
                    <span className="text-3xl font-black text-[#5C4F4A]">다시 해보자!</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Side: Mission + Digital Clock Area */}
          <div className="flex flex-col items-center gap-8 w-full max-w-md">
            
            {/* Mission & Guidance */}
            <div className="w-full flex flex-col items-center gap-4">
              {mode === 'admin' && (
                <div className="flex bg-white/60 p-1 rounded-xl border-2 border-[#C9996B]/20 gap-1 mb-2">
                  <button 
                    onClick={() => setAdminView('settings')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${adminView === 'settings' ? 'bg-[#C9996B] text-white' : 'text-[#C9996B]'}`}
                  >
                    교사 설정
                  </button>
                  <button 
                    onClick={() => setAdminView('game')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${adminView === 'game' ? 'bg-[#C9996B] text-white' : 'text-[#C9996B]'}`}
                  >
                    학생용 화면
                  </button>
                </div>
              )}

              {mode === 'admin' && adminView === 'settings' && (
                <div className="w-full bg-white/80 p-6 rounded-[2.5rem] border-4 border-[#C9996B] shadow-xl mb-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-[#C9996B] rounded-full flex items-center justify-center text-white"><ArrowRight size={16} className="-rotate-90" /></div>
                    <p className="text-sm font-black text-[#C9996B] uppercase tracking-widest">교사용 문제 설정</p>
                  </div>
                  <div className="flex items-center justify-center scale-90 sm:scale-100 mb-6">
                    <DigitalClock time={adminTarget} onChange={setAdminTarget} />
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {adminCustomPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedPresetIndex(idx);
                          setAdminTarget(preset);
                          setShowSaveFeedback(false);
                        }}
                        className={`w-10 h-10 rounded-xl text-sm font-black transition-all border-b-4 active:translate-y-1 active:border-b-0 ${
                          selectedPresetIndex === idx
                            ? 'bg-[#C9996B] text-white border-[#5C4F4A]/20'
                            : 'bg-white text-[#C9996B] border-[#EDE9E6] hover:bg-[#EDE9E6]'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col items-center gap-4 mb-6">
                    <button
                      onClick={saveCurrentPreset}
                      className="w-full max-w-[200px] py-3 bg-[#EF4444] text-white rounded-2xl font-black shadow-lg border-b-4 border-[#5C4F4A]/20 active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2 transition-all hover:brightness-105"
                    >
                      <CheckCircle2 size={20} />
                      {selectedPresetIndex + 1}번 문제 저장하기
                    </button>
                    <AnimatePresence>
                      {showSaveFeedback && (
                        <motion.span
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-[#EF4444] font-black text-xs"
                        >
                          저장되었습니다! ✨
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="bg-[#EDE9E6] p-3 rounded-xl border border-[#C9996B]/20">
                    <p className="text-[11px] text-[#5C4F4A] font-black leading-relaxed">
                      번호(1~5)를 누르고 아래 시계를 돌려 시간을 저장하세요!<br/>
                      '학생용 화면'을 누르면 1번부터 차례대로 시작됩니다.
                    </p>
                  </div>
                </div>
              )}

              {showQuizCompletion && mode === 'quiz' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full bg-white p-8 rounded-[3rem] shadow-xl border-4 border-[#C9996B]/20 text-center"
                >
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-[#EDE9E6] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trophy size={48} className="text-[#C9996B]" />
                    </div>
                    <h2 className="text-3xl font-black text-[#5C4F4A] mb-2 tracking-tighter">모든 미션 완료!</h2>
                    <p className="text-[#C9996B] font-bold">5문제를 모두 맞혔어요. 정말 대단해요!</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={continueQuiz}
                      className="w-full py-4 bg-[#C9996B] text-white rounded-2xl font-black shadow-lg border-b-4 border-[#5C4F4A]/20 active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={20} />
                      이어서 더 하기
                    </button>
                    <button
                      onClick={() => {
                        setShowQuizCompletion(false);
                        setQuizView('selection');
                      }}
                      className="w-full py-4 bg-white text-[#C9996B] rounded-2xl font-black shadow-md border-b-4 border-[#EDE9E6] active:translate-y-1 active:border-b-0"
                    >
                      레벨 다시 고르기
                    </button>
                  </div>
                </motion.div>
              ) : mode === 'admin' && adminView === 'game' && adminQuizIndex === 5 ? (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full text-center bg-white p-8 rounded-[3rem] shadow-2xl border-4 border-[#C9996B] flex flex-col items-center gap-6"
                >
                  <div className="w-20 h-20 bg-[#C9996B] rounded-full flex items-center justify-center text-white shadow-lg">
                    <Trophy size={40} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-[#5C4F4A] mb-2 uppercase tracking-tighter">모든 미션 완료!</h2>
                    <p className="text-[#5C4F4A]/60 font-black">선생님이 준비하신 모든 문제를 풀었어요 ✨</p>
                  </div>
                  <button
                    onClick={() => setAdminQuizIndex(0)}
                    className="w-full py-4 bg-[#C9996B] text-white rounded-2xl font-black shadow-lg border-b-4 border-[#5C4F4A]/20 active:translate-y-1 active:border-b-0"
                  >
                    다시 시작하기
                  </button>
                </motion.div>
              ) : mode === 'quiz' && quizView === 'selection' ? (
                <div className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center mb-2">
                    <p className="text-[#C9996B] font-black text-xs uppercase tracking-widest mb-1">CHOOSE YOUR MISSION</p>
                    <h2 className="text-3xl font-black text-[#5C4F4A]">어떤 도전을 해볼까?</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { l: 1, t: '정각 맞추기', d: '분침(파랑)은 움직이지 않아요.' },
                      { l: 2, t: '5분 단위 마스터', d: '시침(빨강)은 항상 고정이에요.' },
                      { l: 3, t: '시간 박사 도전', d: '모든 시간을 맞출 수 있을까?' }
                    ].map((level) => (
                      <button
                        key={level.l}
                        onClick={() => startQuiz(level.l)}
                        className="group flex flex-col items-center bg-white p-5 rounded-[2rem] border-4 border-[#EDE9E6] hover:border-[#C9996B]/30 hover:shadow-xl transition-all active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <span className="w-8 h-8 bg-[#C9996B] text-white rounded-full flex items-center justify-center font-black text-sm">
                            {level.l}
                          </span>
                          <span className="text-xl font-black text-[#5C4F4A]">레벨 {level.l}: {level.t}</span>
                        </div>
                        <p className="text-[11px] font-bold text-[#C9996B]/70">{level.d}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (mode === 'quiz' || (mode === 'admin' && adminView === 'game')) && currentQuiz ? (
                <div className="w-full flex flex-col gap-4">
                  {mode === 'quiz' && quizView === 'active' && (
                    <button 
                      onClick={() => setQuizView('selection')}
                      className="self-center flex items-center gap-2 px-6 py-2 bg-white/60 rounded-full text-[#C9996B] font-black text-sm border-2 border-[#C9996B]/20 shadow-sm hover:bg-white transition-all active:scale-95 group"
                    >
                      <RotateCcw size={18} className="group-hover:rotate-[-45deg] transition-transform" />
                      <span>레벨 다시 고르기</span>
                    </button>
                  )}
                  
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full text-center bg-white p-6 rounded-[2rem] shadow-lg border-4 border-[#C9996B]/20 relative"
                  >
                    <div className="text-[#C9996B] font-black text-xs mb-1 tracking-widest uppercase flex justify-center items-center gap-2">
                      {mode === 'quiz' ? <Trophy size={16} /> : <ArrowRight size={16} />}
                      {mode === 'quiz' ? `레벨 ${quizLevel}` : `PROBLEM ${adminQuizIndex + 1} / 5`}
                    </div>
                    <h2 className="text-3xl font-black text-[#5C4F4A] mb-4">
                      {currentQuiz.targetHours}시 {currentQuiz.targetMinutes === 0 ? '정각' : `${currentQuiz.targetMinutes}분`}
                    </h2>
                    {(mode === 'quiz' || mode === 'admin') && (
                      <div className="flex justify-center gap-2">
                        {[0, 1, 2, 3, 4].map(i => {
                          const isFilled = mode === 'quiz' ? (i + 1 <= quizScore) : (i < adminQuizIndex);
                          const isCurrent = mode === 'admin' && i === adminQuizIndex;
                          const maxDots = 5; 
                          if (i >= maxDots) return null;
                          
                          return (
                            <div 
                              key={i} 
                              className={`h-2 transition-all rounded-full ${isFilled ? 'w-8 bg-[#C9996B]' : isCurrent ? 'w-8 bg-[#C9996B]/40 animate-pulse' : 'w-4 bg-[#EDE9E6]'}`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                </div>
              ) : mode === 'exploration' ? (
                <div className="p-6 bg-white rounded-3xl border-2 border-[#C9996B]/30 shadow-sm w-full text-center">
                  <p className="text-xs font-black text-[#C9996B] mb-2 uppercase tracking-widest">EXPLORATION MODE</p>
                  <p className="text-xl leading-tight font-bold text-[#5C4F4A]">
                    시계 바늘을 돌리며 시간을 탐험해요!
                  </p>
                </div>
              ) : null}

              {/* Hand Guides (Always shown in exploration or as helper) */}
              <div className="w-full flex items-center justify-center gap-6 bg-white/40 p-3 rounded-2xl border-2 border-[#C9996B]/10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#EF4444] rounded-full shadow-sm"></div>
                  <span className="text-sm font-black text-[#EF4444]">시: 빨강</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#3B82F6] rounded-full shadow-sm"></div>
                  <span className="text-sm font-black text-[#3B82F6]">분: 파랑</span>
                </div>
              </div>
            </div>

            {/* Hint / Digital Clock */}
            <div className="w-full flex flex-col items-center gap-6">
              <AnimatePresence mode="wait">
                {(mode === 'exploration' || showHint || showSuccess) ? (
                  <motion.div
                    key="visible-digital"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="w-full flex justify-center"
                  >
                    <DigitalClock 
                      time={currentTime} 
                      onChange={setCurrentTime}
                      lockHour={mode === 'quiz' && quizView === 'active' && quizLevel === 2}
                      lockMinute={mode === 'quiz' && quizView === 'active' && quizLevel === 1}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="hidden-digital"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full flex flex-col items-center gap-4 py-4"
                  >
                    <button
                      onClick={() => setShowHint(true)}
                      className="group w-full max-w-sm flex flex-col items-center gap-3 bg-white/40 p-8 rounded-[3rem] border-4 border-dashed border-[#C9996B]/30 hover:bg-white/60 transition-all active:scale-95"
                    >
                      <Eye size={48} className="text-[#C9996B] group-hover:scale-110 transition-transform" />
                      <span className="text-[#C9996B] font-black text-xl tracking-tight">디지털 시계 확인하기</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {(mode === 'quiz' || (mode === 'admin' && adminView === 'game')) ? (
                <div className={`flex gap-4 w-full justify-center ${mode === 'admin' && adminQuizIndex === 5 ? 'hidden' : ''}`}>
                  {showHint && !showSuccess && (
                    <button
                      onClick={() => setShowHint(false)}
                      className="px-6 py-4 rounded-2xl font-black bg-white text-[#5C4F4A]/60 shadow-md border-b-4 border-[#EDE9E6] active:translate-y-1 active:border-b-0"
                    >
                      가리기
                    </button>
                  )}
                  {showSuccess && (mode === 'quiz' || mode === 'admin') ? (
                    <button
                      onClick={handleNextProblem}
                      className="flex-1 max-w-[240px] px-10 py-4 rounded-2xl font-black text-xl shadow-lg transition-all transform active:scale-95 border-b-4 bg-[#EF4444] text-white border-[#5C4F4A]/20 hover:brightness-105 active:border-b-0 active:translate-y-1 font-sans"
                    >
                      다음 문제
                    </button>
                  ) : (
                    <button
                      onClick={checkAnswer}
                      disabled={showSuccess}
                      className={`flex-1 max-w-[240px] px-10 py-4 rounded-2xl font-black text-xl shadow-lg transition-all transform active:scale-95 border-b-4 ${
                        showSuccess 
                          ? 'bg-white text-[#5C4F4A]/40 border-[#EDE9E6] cursor-not-allowed' 
                          : 'bg-[#C9996B] text-white border-[#5C4F4A]/20 hover:brightness-105 active:border-b-0 active:translate-y-1 font-sans'
                      }`}
                    >
                      정답인가요?
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-4">
                  <div className="bg-white/60 backdrop-blur-sm border-2 border-[#C9996B]/20 px-6 py-3 rounded-2xl flex items-center gap-3 w-full">
                    <span className="w-3 h-3 rounded-full bg-[#C9996B] shadow-sm animate-pulse" />
                    <p className="text-[#C9996B] font-bold text-sm leading-tight text-center flex-1">
                      바늘이나 숫자 카드를 움직여보세요!
                    </p>
                  </div>
                  <button
                    onClick={() => speakTime(currentTime.hour, currentTime.minute)}
                    className="flex items-center gap-2 bg-white px-6 py-3 rounded-2xl shadow-md border-b-4 border-[#EDE9E6] hover:bg-[#EDE9E6] transition-all active:translate-y-1 active:border-b-0 group"
                  >
                    <Volume2 size={24} className="text-[#C9996B] group-hover:scale-110 transition-transform" />
                    <span className="text-[#5C4F4A] font-black text-lg">몇 시인가요?</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Footer Area */}
      <footer className="h-16 bg-white border-t-2 border-[#C9996B]/10 px-10 flex items-center justify-center shrink-0">
        <p className="text-[#C9996B] font-bold text-sm tracking-wide">
          "시침과 분침을 한눈에 보며 시간 박사가 되어볼까요?"
        </p>
      </footer>
    </div>
  );
}

// Analog Clock Component
function AnalogClock({ time, onChange, interactive, lockHour, lockMinute }: { 
  time: Time; 
  onChange: (t: Time) => void; 
  interactive: boolean;
  lockHour?: boolean;
  lockMinute?: boolean;
}) {
  const clockRef = useRef<HTMLDivElement>(null);

  const hourRotation = (time.hour % 12) * 30 + (time.minute / 60) * 30;
  const minuteRotation = time.minute * 6;

  const handleDrag = (e: any, type: 'hour' | 'minute') => {
    if (!clockRef.current) return;
    if (type === 'hour' && lockHour) return;
    if (type === 'minute' && lockMinute) return;
    
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI) + 90;
    const normalizedAngle = (angle + 360) % 360;

    if (type === 'minute') {
      let rawMinutes = normalizedAngle / 6;
      let snappedMinutes = Math.round(rawMinutes / 5) * 5; // Strictly snap to 5 minutes
      const newMinutes = snappedMinutes % 60;
      
      const oldMinutes = time.minute;
      let newHour = time.hour;

      // Detect rollover (crossing 12 o'clock)
      // Clockwise rollover: 55 -> 0 (or similar bridge)
      if (!lockHour) {
        if (oldMinutes >= 45 && newMinutes <= 15 && oldMinutes > newMinutes) {
          newHour = time.hour + 1;
          if (newHour > 12) newHour = 1;
        } 
        // Counter-clockwise rollover: 0 -> 55 (or similar bridge)
        else if (oldMinutes <= 15 && newMinutes >= 45 && oldMinutes < newMinutes) {
          newHour = time.hour - 1;
          if (newHour < 1) newHour = 12;
        }
      }

      onChange({ hour: newHour, minute: newMinutes });
    } else {
      let rawHours = normalizedAngle / 30;
      let snappedHour = Math.floor(rawHours) || 12;
      onChange({ ...time, hour: snappedHour });
    }
  };

  return (
    <div 
      ref={clockRef}
      className="w-80 h-80 sm:w-[480px] sm:h-[480px] bg-white rounded-full border-[12px] border-[#C9996B] shadow-[0_15px_0_0_#C9996B/60,0_25px_30px_rgba(92,79,74,0.1)] flex items-center justify-center relative touch-none"
    >
      {/* Dashed Inner ring */}
      <div className="absolute inset-4 border-2 border-dashed border-[#C9996B]/10 rounded-full scale-105 pointer-events-none" />

      {/* Main Hour Numbers (matching design) */}
      {[...Array(12)].map((_, i) => {
        const hour = i === 0 ? 12 : i;
        const angle = i * 30;
        const isMajor = [12, 3, 6, 9].includes(hour);
        const numbersZIndex = lockMinute ? 'z-40' : 'z-30';
        return (
          <div
            key={hour}
            className={`absolute font-black ${numbersZIndex} ${isMajor ? 'text-5xl text-[#EF4444]' : 'text-3xl text-[#EF4444]/60'}`}
            style={{
              transform: `rotate(${angle}deg) translateY(-175px) rotate(-${angle}deg)`
            }}
          >
            {hour}
          </div>
        );
      })}

      {/* 5-Minute markings (External guide - Blue) */}
      {[...Array(12)].map((_, i) => {
        const val = i === 0 ? 60 : i * 5;
        const angle = i * 30;
        const guideZIndex = lockMinute ? 'z-40' : 'z-30';
        return (
          <div
            key={`guide-${i}`}
            className={`absolute font-black text-lg text-[#3B82F6] ${guideZIndex}`}
            style={{
              transform: `rotate(${angle}deg) translateY(-225px) rotate(-${angle}deg)`
            }}
          >
            {val}
          </div>
        );
      })}

      {/* Center dot */}
      <div className="absolute w-8 h-8 bg-[#C9996B] rounded-full z-40 ring-4 ring-white shadow-md shadow-inner" />

      {/* Minute Hand (Blue) */}
      <motion.div
        drag={interactive && !lockMinute}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0}
        dragMomentum={false}
        onDrag={(e) => handleDrag(e, 'minute')}
        className={`absolute w-[200px] h-5 origin-left rounded-full ${lockMinute ? 'z-20' : 'z-50'} flex items-center justify-end pr-4 left-1/2 ${lockMinute ? 'cursor-default opacity-60' : 'cursor-grab active:cursor-grabbing'}`}
        style={{
          rotate: minuteRotation - 90,
          backgroundColor: '#3B82F6',
          boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
          translateY: '-50%'
        }}
      >
        <div className="w-12 h-12 bg-white rounded-full border-4 border-[#3B82F6] flex items-center justify-center rotate-inherit shadow-sm">
           <span className="text-[#3B82F6] font-black text-lg">분</span>
        </div>
      </motion.div>

      {/* Hour Hand (Red) */}
      <motion.div
        drag={interactive && !lockHour}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0}
        dragMomentum={false}
        onDrag={(e) => handleDrag(e, 'hour')}
        className={`absolute w-[150px] h-8 origin-left rounded-full ${lockMinute ? 'z-30' : 'z-20'} flex items-center justify-end pr-4 left-1/2 ${lockHour ? 'cursor-default opacity-60' : 'cursor-grab active:cursor-grabbing'}`}
        style={{
          rotate: hourRotation - 90,
          backgroundColor: '#EF4444',
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
          translateY: '-50%'
        }}
      >
         <div className="w-12 h-12 bg-white rounded-full border-4 border-[#EF4444] flex items-center justify-center rotate-inherit shadow-sm">
           <span className="text-[#EF4444] font-black text-lg">시</span>
        </div>
      </motion.div>
    </div>
  );
}

// Digital Clock Component
function DigitalClock({ time, onChange, lockHour, lockMinute }: { 
  time: Time; 
  onChange: (t: Time) => void;
  lockHour?: boolean;
  lockMinute?: boolean;
}) {
  const handleTimeStep = (type: 'hour' | 'minute', delta: number) => {
    if (type === 'hour' && lockHour) return;
    if (type === 'minute' && lockMinute) return;
    if (type === 'hour') {
      let newHour = (time.hour + delta);
      if (newHour > 12) newHour = 1;
      if (newHour < 1) newHour = 12;
      onChange({ ...time, hour: newHour });
    } else {
      let newMin = (time.minute + delta);
      let newHour = time.hour;

      if (newMin >= 60) {
        newMin = 0;
        if (!lockHour) {
          newHour = time.hour + 1;
          if (newHour > 12) newHour = 1;
        } else {
          // If locked, just stay at 55 or loop back to 0 without changing hour
          newMin = 55; // Prevent rollover
        }
      } else if (newMin < 0) {
        newMin = 55;
        if (!lockHour) {
          newHour = time.hour - 1;
          if (newHour < 1) newHour = 12;
        } else {
          newMin = 0; // Prevent rollover
        }
      }
      
      onChange({ hour: newHour, minute: newMin });
    }
  };

  return (
    <div className="flex items-center gap-4 bg-white/40 p-4 rounded-[2.5rem] border-2 border-[#C9996B]/20 shadow-sm">
      {/* Hour Block */}
      <div className={`flex flex-col items-center gap-2 ${lockHour ? 'opacity-40 pointer-events-none' : ''}`}>
        <button 
          onClick={() => handleTimeStep('hour', 1)}
          className="p-2 hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors"
        >
          <ArrowRight size={32} className="-rotate-90 stroke-[3]" />
        </button>
        <div className="w-28 h-36 bg-white border-4 border-[#C9996B]/30 rounded-2xl shadow-md flex items-center justify-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-[#EDE9E6] opacity-30 group-hover:opacity-40 transition-opacity" />
          <span className="text-7xl font-black text-[#EF4444] z-10 drop-shadow-sm font-sans">
            {time.hour}
          </span>
        </div>
        <button 
          onClick={() => handleTimeStep('hour', -1)}
          className="p-2 hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors"
        >
          <ArrowRight size={32} className="rotate-90 stroke-[3]" />
        </button>
      </div>

      <span className="text-6xl font-black text-[#C9996B]/30 mb-8">:</span>

      {/* Minute Block */}
      <div className={`flex flex-col items-center gap-2 ${lockMinute ? 'opacity-40 pointer-events-none' : ''}`}>
        <button 
          onClick={() => handleTimeStep('minute', 5)}
          className="p-2 hover:bg-blue-50 text-blue-300 hover:text-blue-500 transition-colors"
        >
          <ArrowRight size={32} className="-rotate-90 stroke-[3]" />
        </button>
        <div className="w-28 h-36 bg-white border-4 border-[#C9996B]/30 rounded-2xl shadow-md flex items-center justify-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-[#EDE9E6] opacity-30 group-hover:opacity-40 transition-opacity" />
          <span className="text-7xl font-black text-[#3B82F6] z-10 drop-shadow-sm font-sans">
            {time.minute.toString().padStart(2, '0')}
          </span>
        </div>
        <button 
          onClick={() => handleTimeStep('minute', -5)}
          className="p-2 hover:bg-blue-50 text-blue-300 hover:text-blue-500 transition-colors"
        >
          <ArrowRight size={32} className="rotate-90 stroke-[3]" />
        </button>
      </div>
    </div>
  );
}
