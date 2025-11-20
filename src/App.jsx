import React, { useState, useEffect, createContext, useContext } from 'react';
import { auth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from './firebaseConfig';
import { db } from './firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// --- DATABASE & MOCK DATA ---
// In a real app, this data would come from a Firestore database.
const AppContext = createContext();

// Main App Component
function App() {
    // --- STATE MANAGEMENT ---
    const [currentPage, setCurrentPage] = useState('landing');
    const [teams, setTeams] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentCourse, setCurrentCourse] = useState(null);
    const [progress, setProgress] = useState({});
    const [notification, setNotification] = useState({ show: false, message: '' });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const teamRef = doc(db, "teams", user.uid);
                const teamSnap = await getDoc(teamRef);
                if (teamSnap.exists()) {
                    const teamData = teamSnap.data();
                    setCurrentUser({ ...user, ...teamData });
                    try {
                        const response = await fetch(`/${teamData.class}.json`);
                        if (!response.ok) {
                            throw new Error('Course data not found.');
                        }
                        const courseData = await response.json();
                        setCurrentCourse(courseData);
                        if (!progress[user.uid]) {
                            setProgress(prev => ({ ...prev, [user.uid]: {} }));
                        }
                    } catch (error) {
                        console.error("Failed to load course data:", error);
                        showNotification('Could not load course data. Please try again.');
                    }
                } else {
                    setCurrentUser(user);
                }
            } else {
                setCurrentUser(null);
                setCurrentCourse(null);
            }
        });
        return () => unsubscribe();
    }, []);

    // --- DATA HANDLING FUNCTIONS ---
    const signUpTeam = async (email, password, teamData) => {
        try {
            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "teams", user.uid), teamData);
            showNotification(`Team "${teamData.teamName}" registered successfully! Please log in.`);
            setCurrentPage('login');
        } catch (error) {
            console.error("Error signing up:", error);
            showNotification(error.message);
        }
    };

    const loginTeam = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (error) {
            console.error("Error logging in:", error);
            showNotification(error.message);
            return false;
        }
    };
    
    const logout = async () => {
        try {
            await signOut(auth);
            setCurrentUser(null);
            setCurrentCourse(null);
            setCurrentPage('landing');
            showNotification("You have been logged out.");
        } catch (error) {
            console.error("Error signing out:", error);
            showNotification(error.message);
        }
    };

    const completeChapter = (chapterId) => {
        if(!currentUser) return;
        setProgress(prev => ({
            ...prev,
            [currentUser.id]: { ...prev[currentUser.id], [chapterId]: 'complete' }
        }));
    };
    
    const completeModule = (moduleId) => {
        if(!currentUser) return;
        setProgress(prev => ({
            ...prev,
            [currentUser.id]: { ...prev[currentUser.id], [moduleId]: 'complete' }
        }));
    };

    const showNotification = (message) => {
        setNotification({ show: true, message });
        setTimeout(() => setNotification({ show: false, message: '' }), 4000);
    };

    // --- ROUTING ---
    const renderPage = () => {
        switch (currentPage) {
            case 'signup': return <SignUpPage />;
            case 'login': return <LoginPage />;
            case 'dashboard': return <DashboardPage />;
            case 'congratulations': return <CongratulationsPage />;
            default: return <LandingPage />;
        }
    };

    const contextValue = {
        setCurrentPage,
        signUpTeam,
        loginTeam,
        logout,
        currentUser,
        currentCourse,
        progress,
        completeChapter,
        completeModule,
        showNotification,
        teams
    };

    return (
        <AppContext.Provider value={contextValue}>
            <div className="bg-slate-100 min-h-screen font-sans text-slate-800 relative">
                {notification.show && <Notification message={notification.message} />}
                {renderPage()}
            </div>
        </AppContext.Provider>
    );
}

// --- SHARED HEADER COMPONENT ---
function Header({ onBack }) {
    const { logout, currentUser } = useContext(AppContext); // Destructure currentUser
    return (
        <header className="absolute top-0 right-0 p-4 flex gap-3 z-10">
            {onBack && (
                 <button onClick={onBack} className="text-sm bg-white text-slate-700 font-semibold py-2 px-4 rounded-lg shadow-sm border border-slate-300 hover:bg-slate-50 transition">
                    ← Back
                </button>
            )}
            {currentUser && ( // Conditionally render Logout button
                <button onClick={logout} className="text-sm bg-red-500 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-red-600 transition">
                    Logout
                </button>
            )}
        </header>
    );
}


// --- PAGES ---

function LandingPage() {
    const { setCurrentPage } = useContext(AppContext);
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gradient-to-br from-sky-500 to-indigo-600">
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 drop-shadow-lg">STREAM COURSE</h1>
            <p className="text-xl md:text-2xl text-indigo-200 mb-10 max-w-2xl">A One-Month Journey into Science, Technology, Robotics, Engineering, Arts, and Mathematics.</p>
            <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => setCurrentPage('signup')} className="bg-white text-indigo-600 font-bold py-3 px-10 rounded-full text-lg shadow-lg hover:bg-indigo-100 transition-transform transform hover:scale-105">
                    SIGN UP
                </button>
                <button onClick={() => setCurrentPage('login')} className="bg-indigo-500 text-white font-bold py-3 px-10 rounded-full text-lg shadow-lg hover:bg-indigo-400 transition-transform transform hover:scale-105">
                    LOGIN
                </button>
            </div>
        </div>
    );
}

function SignUpPage() {
    const { setCurrentPage, signUpTeam } = useContext(AppContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [schoolName, setSchoolName] = useState('');
    const [schoolLocation, setSchoolLocation] = useState('');
    const [selectedClass, setSelectedClass] = useState('6');
    const [teamName, setTeamName] = useState('');
    const [students, setStudents] = useState(['']);

    const handleAddStudent = () => setStudents([...students, '']);
    
    const handleStudentNameChange = (index, name) => {
        const newStudents = [...students];
        newStudents[index] = name;
        setStudents(newStudents);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!schoolName || !selectedClass || !teamName || students.some(s => s.trim() === '')) {
            alert('Please fill all fields, including all student names.');
            return;
        }
        const teamData = { school: { name: schoolName }, schoolLocation, class: selectedClass, teamName, students };
        signUpTeam(email, password, teamData);
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-slate-50">
            <Header onBack={() => setCurrentPage('landing')} />
            <div className="w-full max-w-2xl mx-auto bg-white p-8 pt-16 rounded-2xl shadow-lg">
                <h2 className="text-3xl font-bold text-center text-slate-700 mb-6">Create Your Team Account</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <InputField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="School Name" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required />
                        <InputField label="School Location (City/Town)" value={schoolLocation} onChange={(e) => setSchoolLocation(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SelectField label="Class / Standard" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} options={[5,6,7,8,9,10]}/>
                        <InputField label="Team Name" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g., The Circuit Breakers" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Student Names</label>
                        {students.map((student, index) => (
                            <InputField key={index} value={student} onChange={(e) => handleStudentNameChange(index, e.target.value)} placeholder={`Student ${index + 1} Name`} required className="mb-2" />
                        ))}
                        <button type="button" onClick={handleAddStudent} className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold">+ Add Another Student</button>
                    </div>
                    <div className="flex items-center justify-end pt-4">
                        <button type="submit" className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-indigo-700 transition">
                            SUBMIT REGISTRATION
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function LoginPage() {
    const { setCurrentPage, loginTeam } = useContext(AppContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        const success = await loginTeam(email, password);
        if (success) {
            setCurrentPage('dashboard');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-slate-50">
            <Header onBack={() => setCurrentPage('landing')} />
            <div className="w-full max-w-md mx-auto bg-white p-8 pt-16 rounded-2xl shadow-lg">
                <h2 className="text-3xl font-bold text-center text-slate-700 mb-8">Team Login</h2>
                <form onSubmit={handleLogin} className="space-y-6">
                    <InputField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <InputField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <div className="flex items-center justify-end pt-4">
                        <button type="submit" className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-indigo-700 transition">LOGIN</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DashboardPage() {
    const { currentUser, currentCourse, progress, setCurrentPage, logout } = useContext(AppContext);
    const [activeChapter, setActiveChapter] = useState(null);

    useEffect(() => {
        if (currentCourse?.modules?.[0]?.chapters?.[0]) {
            setActiveChapter(currentCourse.modules[0].chapters[0]);
        }
    }, [currentCourse]);

    if (!currentUser || !currentCourse) {
        return <div className="p-8">Loading...</div>;
    }
    
    const userProgress = progress[currentUser.id] || {};
    const allModulesComplete = currentCourse.modules.every(m => userProgress[m.id] === 'complete');

    return (
        <div className="flex flex-col md:flex-row min-h-screen">
            <aside className="w-full md:w-1/4 bg-white p-6 border-r border-slate-200 shadow-md relative">
                 <Header onBack={logout} />
                <div className="mt-16">
                    <h2 className="text-xl font-bold text-indigo-700">{currentCourse.name}</h2>
                    <p className="text-sm text-slate-500 mb-6">Team: {currentUser.teamName}</p>
                    <nav className="space-y-4">
                        {currentCourse.modules.map((module, moduleIndex) => {
                            const isModuleComplete = userProgress[module.id] === 'complete';
                            const isUnlocked = moduleIndex === 0 || userProgress[currentCourse.modules[moduleIndex - 1]?.id] === 'complete';
                            
                            return (
                                <div key={module.id}>
                                    <h3 className={`flex items-center justify-between font-bold text-lg ${isUnlocked ? 'text-slate-800' : 'text-slate-400'}`}>
                                        {module.name}
                                        {isModuleComplete && <span className="text-green-500">✅</span>}
                                        {!isUnlocked && <span className="text-slate-400 text-xs">🔒 LOCKED</span>}
                                    </h3>
                                    {isUnlocked && (
                                        <ul className="mt-2 space-y-1 pl-4 border-l-2 border-slate-200">
                                            {module.chapters.map(chapter => {
                                                const isChapterComplete = userProgress[chapter.id] === 'complete';
                                                return (
                                                    <li key={chapter.id}>
                                                        <button 
                                                            onClick={() => setActiveChapter(chapter)}
                                                            className={`flex items-center w-full text-left p-1 rounded ${activeChapter?.id === chapter.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100'}`}
                                                        >
                                                            <span className={isChapterComplete ? 'text-green-500 mr-2' : 'text-slate-400 mr-2'}>
                                                                {isChapterComplete ? '✓' : '•'}
                                                            </span>
                                                            {chapter.title}
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                     {allModulesComplete && (
                        <div className="mt-8">
                            <button onClick={() => setCurrentPage('congratulations')} className="w-full bg-yellow-400 text-yellow-900 font-bold py-3 rounded-lg shadow-md hover:bg-yellow-500 transition">
                                🎉 View Certificate 🎉
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            <main className="flex-1 p-6 md:p-10 bg-slate-50">
                {activeChapter ? <ChapterContent key={activeChapter.id} chapter={activeChapter} module={currentCourse.modules.find(m => m.chapters.includes(activeChapter))} setActiveChapter={setActiveChapter} /> : <div>Select a chapter to begin.</div>}
            </main>
        </div>
    );
}

function ChapterContent({ chapter, module, setActiveChapter }) {
    const { completeChapter, showNotification, progress, currentUser, currentCourse } = useContext(AppContext);
    
    const userProgress = progress[currentUser.id] || {};
    const isChapterComplete = userProgress[chapter.id] === 'complete';

    const findNextChapter = () => {
        const currentModuleIndex = currentCourse.modules.findIndex(m => m.id === module.id);
        const currentChapterIndex = module.chapters.findIndex(c => c.id === chapter.id);

        if (currentChapterIndex < module.chapters.length - 1) {
            return module.chapters[currentChapterIndex + 1];
        }

        if (currentModuleIndex < currentCourse.modules.length - 1) {
            const nextModule = currentCourse.modules[currentModuleIndex + 1];
            if (nextModule.chapters.length > 0) {
                return nextModule.chapters[0];
            }
        }
        return null;
    };

    const nextChapter = findNextChapter();

    const handleMarkComplete = () => {
        completeChapter(chapter.id);
        showNotification(`Chapter "${chapter.title}" marked as complete!`);
    };

    const handleNext = () => {
        if (nextChapter) {
            const nextModule = currentCourse.modules.find(m => m.chapters.includes(nextChapter));
            const currentModule = currentCourse.modules.find(m => m.chapters.includes(chapter));
            if (nextModule.id !== currentModule.id) {
                if(userProgress[currentModule.id] !== 'complete') {
                    showNotification(`You must complete the assignment for "${currentModule.name}" to proceed.`);
                    return;
                }
            }
            setActiveChapter(nextChapter);
        } else {
             const allModulesComplete = currentCourse.modules.every(m => userProgress[m.id] === 'complete');
             if(allModulesComplete) {
                showNotification("Congratulations! You've finished all the chapters.");
             }
        }
    };

    const handleDownload = (e, url) => {
        e.preventDefault();
        window.open(url, '_blank');
    }

    const renderContent = () => {
        switch (chapter.type) {
            case 'youtube':
                return <div className="aspect-w-16 aspect-h-9 bg-black rounded-lg shadow-lg overflow-hidden"><iframe className="w-full h-full" src={`https://www.youtube.com/embed/${chapter.videoId}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div>;
            case 'pdf':
                return <div className="bg-white p-6 rounded-lg shadow"><p className="text-slate-600 mb-4">{chapter.description}</p><div className="h-96 bg-slate-200 rounded flex items-center justify-center text-slate-500 mb-4">PDF Viewer Placeholder</div><a href={chapter.url} onClick={(e) => handleDownload(e, chapter.url)} className="inline-block bg-blue-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-600 transition">📥 DOWNLOAD PDF</a></div>;
            case 'task':
                 return (
                    <div className="bg-white p-6 rounded-lg shadow">
                        <p className="text-slate-600 mb-4">{chapter.description}</p>
                        {chapter.checklist && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {chapter.checklist.map(item => (
                                    <label key={item} className="flex items-center p-2 bg-slate-100 rounded-md">
                                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                        <span className="ml-3 text-sm text-slate-700">{item}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'download':
                 return <div className="bg-white p-6 rounded-lg shadow"><p className="text-slate-600 mb-4">{chapter.description}</p><a href={chapter.url} onClick={(e) => handleDownload(e, chapter.url)} className="inline-block bg-green-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-600 transition">📥 DOWNLOAD {chapter.fileName.toUpperCase()}</a></div>;
            case 'quiz':
                return <Quiz chapter={chapter} module={module} onQuizComplete={handleNext} />;
            default:
                return <p>Content type not recognized.</p>;
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-slate-800 mb-6">{chapter.title}</h1>
            {renderContent()}
            {chapter.type !== 'quiz' && (
                <div className="mt-8 flex items-center justify-end gap-4">
                    <button onClick={handleMarkComplete} disabled={isChapterComplete} className="bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-green-600 transition disabled:bg-green-300 disabled:cursor-not-allowed">
                       {isChapterComplete ? '✓ Completed' : 'Mark as Complete'}
                    </button>
                    <button onClick={handleNext} disabled={!isChapterComplete || !nextChapter} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-indigo-700 transition disabled:bg-indigo-300 disabled:cursor-not-allowed">
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}

function Quiz({ chapter, module, onQuizComplete }) {
    const { completeChapter, completeModule, showNotification, setCurrentPage, currentCourse } = useContext(AppContext);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);

    const handleSubmit = () => {
        let correctAnswers = chapter.questions.reduce((count, q, index) => answers[index] === q.correct ? count + 1 : count, 0);
        const finalScore = (correctAnswers / chapter.questions.length) * 100;
        setScore(finalScore);
        setSubmitted(true);

        if (finalScore >= 80) {
            completeChapter(chapter.id);
            const isLastChapterInModule = module.chapters[module.chapters.length - 1].id === chapter.id;
            
            if (isLastChapterInModule) {
                completeModule(module.id);
                const isLastModuleInCourse = currentCourse.modules[currentCourse.modules.length - 1].id === module.id;
                if(isLastModuleInCourse) {
                    // We don't navigate away here, just show notification. The user will click "Next ->"
                    showNotification(`🎉 Congratulations! You have completed the entire course!`);
                } else {
                    showNotification(`🎉 Module "${module.name}" complete! The next module is unlocked.`);
                }
            } else {
                showNotification(`Quiz passed! Score: ${finalScore.toFixed(0)}%`);
            }
        } else {
            showNotification(`Quiz failed. Score: ${finalScore.toFixed(0)}%. Please review and retry.`);
        }
    };

    const handleNextAfterQuiz = () => {
        const isLastModuleInCourse = currentCourse.modules[currentCourse.modules.length - 1].id === module.id;
        if(isLastModuleInCourse) {
            setCurrentPage('congratulations');
        } else {
            onQuizComplete();
        }
    }

    return (
        <div className="bg-white p-8 rounded-lg shadow">
            {!submitted ? (
                <>
                    {chapter.questions.map((q, qIndex) => (
                        <div key={qIndex} className="mb-6">
                            <p className="font-semibold text-lg mb-2">{qIndex + 1}. {q.q}</p>
                            <div className="space-y-2">
                                {q.a.map((option, oIndex) => (
                                    <label key={oIndex} className="flex items-center p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition has-[:checked]:bg-indigo-100 has-[:checked]:ring-2 ring-indigo-400">
                                        <input type="radio" name={`q${qIndex}`} value={option} onChange={() => setAnswers({...answers, [qIndex]: option})} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                        <span className="ml-3 text-slate-700">{option}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                    <button onClick={handleSubmit} className="bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-green-600 transition">SUBMIT ANSWERS</button>
                </>
            ) : (
                <div className="text-center">
                    <h3 className="text-2xl font-bold mb-4">Quiz Results</h3>
                    <p className={`text-5xl font-bold mb-4 ${score >= 80 ? 'text-green-500' : 'text-red-500'}`}>{score.toFixed(0)}%</p>
                    <p className="text-slate-600">{score >= 80 ? 'Excellent work! You have passed.' : 'Please review the module and try again.'}</p>
                    {score < 80 && <button onClick={() => { setSubmitted(false); setAnswers({}); }} className="mt-6 bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg">Retry Quiz</button>}
                    {score >= 80 && <button onClick={handleNextAfterQuiz} className="mt-6 bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-indigo-700 transition">Next →</button>}
                </div>
            )}
        </div>
    );
}

const Firework = () => {
  const fireworks = Array.from({ length: 15 });
  return (
    <div className="fireworks">
      {fireworks.map((_, i) => (
        <div className="firework" key={i} style={{'--i': i}}></div>
      ))}
    </div>
  );
};

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ... (rest of the file)

function CongratulationsPage() {
    const { currentUser, currentCourse, setCurrentPage } = useContext(AppContext);
    const [certIndex, setCertIndex] = useState(0);
    const certificateRef = React.useRef(null);
    const allCertificatesRef = React.useRef(null);

    if (!currentUser || !currentCourse) return null;

    const currentStudent = currentUser.students[certIndex];
    
    const handleDownloadAll = async () => {
        const pdf = new jsPDF('l', 'px', [400, 300]);
        const certificateElements = allCertificatesRef.current.children;

        for (let i = 0; i < certificateElements.length; i++) {
            const certificate = certificateElements[i];
            const canvas = await html2canvas(certificate);
            const imgData = canvas.toDataURL('image/png');
            if (i > 0) {
                pdf.addPage();
            }
            pdf.addImage(imgData, 'PNG', 0, 0, 400, 300);
        }
        pdf.save('certificates.pdf');
    }

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 overflow-hidden">
            <Firework />
            <Header onBack={() => setCurrentPage('dashboard')} />
             <div className="text-center z-10">
                <h1 className="text-5xl font-bold text-center text-yellow-300 mb-4 mt-16 animate-pulse">Congratulations, Team "{currentUser.teamName}"!</h1>
                <p className="text-center text-lg text-slate-300 mb-8">You have successfully completed the <strong>{currentCourse.name}</strong> course. Here are your certificates.</p>
             </div>
            
            <div className="flex items-center justify-center gap-4 z-10 w-full max-w-2xl">
                <button 
                    onClick={() => setCertIndex(i => i - 1)} 
                    disabled={certIndex === 0}
                    className="bg-white/20 text-white p-4 rounded-full disabled:opacity-30 hover:bg-white/30 transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>

                <div ref={certificateRef} className="w-full max-w-lg bg-white border-8 border-yellow-400 p-6 rounded-lg shadow-2xl text-center relative aspect-[4/3] flex flex-col justify-center">
                    <div className="absolute top-2 right-2 text-4xl opacity-50">📜</div>
                    <div className="absolute bottom-2 left-2 text-4xl opacity-50">🎓</div>
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Certificate of Completion</h2>
                    <p className="text-xs text-slate-500 my-2">This is to certify that</p>
                    <p className="text-3xl font-serif text-gray-900">{currentStudent}</p>
                    <p className="text-xs text-slate-500 mt-2">of {currentUser.school.name} (Class {currentUser.class}) has successfully completed the one-month course in</p>
                    <p className="text-xl font-semibold text-gray-800 mt-1">{currentCourse.name}</p>
                    <div className="mt-4 text-xs text-slate-400">
                        <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
                        <p>STREAM Course Inc.</p>
                    </div>
                </div>

                 <button 
                    onClick={() => setCertIndex(i => i + 1)} 
                    disabled={certIndex === currentUser.students.length - 1}
                    className="bg-white/20 text-white p-4 rounded-full disabled:opacity-30 hover:bg-white/30 transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
            <div className="mt-8 text-center z-10">
                <button onClick={handleDownloadAll} className="bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-green-600 transition">
                    📥 Download all certificates as PDF file
                </button>
                <p className="text-slate-400 text-sm mt-2">You can take a print out</p>
            </div>

            {/* Hidden container for rendering all certificates for download */}
            <div ref={allCertificatesRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                {currentUser.students.map(student => (
                    <div key={student} className="w-full max-w-lg bg-white border-8 border-yellow-400 p-6 rounded-lg shadow-2xl text-center relative aspect-[4/3] flex flex-col justify-center" style={{width: '400px', height: '300px'}}>
                        <div className="absolute top-2 right-2 text-4xl opacity-50">📜</div>
                        <div className="absolute bottom-2 left-2 text-4xl opacity-50">🎓</div>
                        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Certificate of Completion</h2>
                        <p className="text-xs text-slate-500 my-2">This is to certify that</p>
                        <p className="text-3xl font-serif text-gray-900">{student}</p>
                        <p className="text-xs text-slate-500 mt-2">of {currentUser.school.name} (Class {currentUser.class}) has successfully completed the one-month course in</p>
                        <p className="text-xl font-semibold text-gray-800 mt-1">{currentCourse.name}</p>
                        <div className="mt-4 text-xs text-slate-400">
                            <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
                            <p>STREAM Course Inc.</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


// --- UTILITY COMPONENTS ---
const InputField = ({ label, className, ...props }) => (
    <div className={className}>
        {label && <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>}
        <input className="block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" {...props} />
    </div>
);

const SelectField = ({ label, options, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
        <select className="block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-200" {...props}>
             <option value="" disabled>-- Select --</option>
            {options.map((opt, index) => (
                typeof opt === 'object' 
                ? <option key={opt.value || index} value={opt.value}>{opt.label}</option> 
                : <option key={index} value={opt}>{opt}</option>
            ))}
        </select>
    </div>
);

const Notification = ({ message }) => (
    <div className="fixed top-5 right-5 bg-green-500 text-white py-3 px-6 rounded-lg shadow-lg animate-fade-in-out z-50">
        {message}
    </div>
);

export default App;
