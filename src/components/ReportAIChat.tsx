import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { MajlisData, FIELD_LABELS } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ReportAIChatProps {
  data: MajlisData[];
  allData: Partial<Record<string, MajlisData[]>>;
  selectedMonth: string;
}

export default function ReportAIChat({ data, allData, selectedMonth }: ReportAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `আসসালামু আলাইকুম! আমি Report AI। আমি আপনাকে মজলিস পারফরম্যান্স ডেটা বিশ্লেষণে সাহায্য করতে পারি। আমি বর্তমানে ${Object.keys(allData).join(', ')} মাসের ডেটা সম্পর্কে জানি। আপনি কী জানতে চান?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only update greeting if the chat was empty or just started
    if (messages.length <= 1) {
      setMessages([
        { role: 'assistant', content: `আসসালামু আলাইকুম! আমি Report AI। আমি আপনাকে মজলিস পারফরম্যান্স ডেটা বিশ্লেষণে সাহায্য করতে পারি। আমি বর্তমানে ${Object.keys(allData).join(', ')} মাসের ডেটা সম্পর্কে জানি। আপনি কী জানতে চান?` }
      ]);
    }
  }, [allData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateResponse = async (userMessage: string) => {
    setIsLoading(true);
    try {
      // Build a multi-month summary
      const monthSummaries = Object.entries(allData).map(([month, monthData]) => {
        if (!monthData) return null;
        return {
          month,
          totalMajlis: monthData.length,
          totalTajnid: monthData.reduce((acc, m) => acc + (m.tajnidMembers || 0), 0),
          avgAmela: monthData.reduce((acc, m) => acc + (m.amelaMeeting || 0), 0) / (monthData.length || 1),
          avgGeneral: monthData.reduce((acc, m) => acc + (m.generalMeeting || 0), 0) / (monthData.length || 1),
          // Top 5 for each month to save context space but give broad overview
          top5: monthData
            .sort((a, b) => (b.amelaMeeting || 0) - (a.amelaMeeting || 0))
            .slice(0, 5)
            .map(m => ({ name: m.majlisName, amela: m.amelaMeeting, general: m.generalMeeting }))
        };
      }).filter(Boolean);

      // Detailed context for current month (selected)
      const currentMonthDetails = data
        .sort((a, b) => {
          const scoreA = (a.amelaMeeting || 0) + (a.generalMeeting || 0);
          const scoreB = (b.amelaMeeting || 0) + (b.generalMeeting || 0);
          return scoreB - scoreA;
        })
        .slice(0, 30)
        .map(m => ({
          name: m.majlisName,
          tajnid: m.tajnidMembers,
          amela: m.amelaMeeting,
          general: m.generalMeeting,
          prayers: m.fiveTimePrayers,
          attendance: m.generalMeetingAttendance,
          tabligh: m.tablighDoneBy
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          month: selectedMonth,
          context: {
            globalSummary: monthSummaries,
            selectedMonthDetails: currentMonthDetails,
            availableMonths: Object.keys(allData)
          }
        })
      });

      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || 'Failed to get response');
      
      setMessages(prev => [...prev, { role: 'assistant', content: result.reply }]);
    } catch (error: any) {
      console.error("Report AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: `দুঃখিত, রিপোর্ট এআই (Report AI) সংযোগে সমস্যা হচ্ছে। আপনার কি (API Key) সঠিকভাবে সেট করা আছে কিনা নিশ্চিত করুন। \n(${error.message})` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    
    await generateResponse(userMessage);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center hover:scale-110 transition-transform z-50 group"
      >
        <MessageSquare size={28} />
        <span className="absolute right-16 bg-white text-slate-800 px-3 py-1 rounded-lg text-xs font-bold border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Report AI-কে জিজ্ঞাসা করুন
        </span>
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Report AI</h3>
                  <p className="text-[10px] opacity-80">Powered by Gemini</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar"
            >
              {messages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "flex gap-3",
                    msg.role === 'user' ? "flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                    msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-white text-indigo-600"
                  )}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-sm shadow-sm",
                    msg.role === 'user' 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : "bg-white text-slate-800 border border-slate-100 rounded-tl-none line-clamp-none whitespace-pre-wrap"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-white text-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                    <Bot size={16} />
                  </div>
                  <div className="bg-white text-slate-400 p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs">রিপোর্ট চিন্তা করছে...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="পারফরম্যান্স সম্পর্কে জিজ্ঞাসা করুন..."
                  className="w-full pl-4 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="mt-2 text-[10px] text-slate-400 text-center">
                এআই ভুল তথ্য দিতে পারে। সবসময় রিপোর্টের সাথে যাচাই করে নিন।
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
