import { useCallback } from "react";
import { apiFetchJson } from "../lib/api";
import type { User } from "../types";

type AuthResponse = { user: User };
type AuthActionsOptions = {
  authEmail:string; authPassword:string; authFullName:string;
  authRole:"admin"|"employee"|"accountant"; rememberMe?:boolean;
  setToken?: (token:string|null)=>void; setSessionActive?:(active:boolean)=>void; setCurrentUser:(user:User)=>void;
  setAuthError:(error:string|null)=>void; setIsAuthLoading:(loading:boolean)=>void;
  setIsRegisterMode:(enabled:boolean)=>void; setActivePreset:(preset:string)=>void;
  setAuthEmail:(email:string)=>void; setAuthPassword:(password:string)=>void;
  setActiveView:(view:string)=>void; addTerminalLog:(type:string,message:string)=>void;
  fetchLogs:()=>void;
};
type LogoutOptions = { setToken?: (token: string | null) => void; setSessionActive?: (active:boolean)=>void; setCurrentUser:(user:User|null)=>void; addTerminalLog:(type:string,message:string)=>void };

function routeUser(user:User,setActiveView:(view:string)=>void){
  if(user.role==="accountant") setActiveView("accounting");
  else if(user.role==="employee") setActiveView("production");
  else setActiveView("dashboard");
}
export function useAuthActions({authEmail,authPassword,authFullName,authRole,rememberMe=false,setToken,setSessionActive=()=>{},setCurrentUser,setAuthError,setIsAuthLoading,setIsRegisterMode,setActivePreset,setAuthEmail,setAuthPassword,setActiveView,addTerminalLog,fetchLogs}:AuthActionsOptions){
  const applySession=useCallback((data:AuthResponse)=>{setToken?.(null);setSessionActive(true);setCurrentUser(data.user);routeUser(data.user,setActiveView);},[setActiveView,setCurrentUser,setSessionActive,setToken]);
  const handleLogin=useCallback(async(event:React.FormEvent)=>{event.preventDefault();setAuthError(null);setIsAuthLoading(true);try{const data=await apiFetchJson<AuthResponse>("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:authEmail,password:authPassword,rememberMe})});applySession(data);addTerminalLog("AUTH",`تم تسجيل دخول ${data.user.fullName} عبر جلسة HttpOnly.`);fetchLogs();}catch(error){const message=error instanceof Error?error.message:"Login Failed";setAuthError(message);addTerminalLog("ERROR",`Auth failed: ${message}`);}finally{setIsAuthLoading(false);}},[addTerminalLog,applySession,authEmail,authPassword,fetchLogs,rememberMe,setAuthError,setIsAuthLoading]);
  const handleRegister=useCallback(async(event:React.FormEvent)=>{event.preventDefault();setAuthError(null);if(!authFullName){setAuthError("الرجاء إدخال الاسم الكامل");return;}setIsAuthLoading(true);try{const data=await apiFetchJson<AuthResponse>("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:authEmail,password:authPassword,fullName:authFullName,role:authRole})});applySession(data);setIsRegisterMode(false);addTerminalLog("AUTH",`تم إنشاء حساب ${data.user.email} بصلاحية ${data.user.role}.`);fetchLogs();}catch(error){const message=error instanceof Error?error.message:"Registration Failed";setAuthError(message);addTerminalLog("ERROR",`Registration failed: ${message}`);}finally{setIsAuthLoading(false);}},[addTerminalLog,applySession,authEmail,authFullName,authPassword,authRole,fetchLogs,setAuthError,setIsAuthLoading,setIsRegisterMode]);
  const setAuthPreset=useCallback((presetKey:string,email:string,password:string)=>{setActivePreset(presetKey);setAuthEmail(email);setAuthPassword(password);setAuthError(null);},[setActivePreset,setAuthEmail,setAuthError,setAuthPassword]);
  return {handleLogin,handleRegister,setAuthPreset};
}
export function useLogoutAction({setToken,setSessionActive=()=>{},setCurrentUser,addTerminalLog}:LogoutOptions){
  const handleLogout=(isAuto:boolean=false)=>{setToken?.(null);void fetch("/api/auth/logout",{method:"POST",credentials:"include"}).catch(()=>{});setSessionActive(false);setCurrentUser(null);addTerminalLog("JWT",isAuto?"تم تسجيل الخروج التلقائي لحماية الجلسة بعد 30 دقيقة من الخمول.":"تم تسجيل الخروج وإغلاق جلسة العمل بأمان.");};
  return {handleLogout};
}
