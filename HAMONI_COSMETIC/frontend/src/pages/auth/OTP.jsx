import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import './OTP.css';

export default function OTP() {
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [loading, setLoading] = useState(false); 
  const [timer, setTimer] = useState(60); 
  const inputRefs = useRef([]);
  const location = useLocation();
  const navigate = useNavigate();
  
  const { email } = location.state || { email: "pthi70483@gmail.com" };

  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  }, []);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);
  const handleResend = async () => {
    if (timer > 0) return; 

    try {
      setLoading(true);
      await axios.post("http://localhost:5000/api/auth/resend-otp", { email });
      
      alert("Mã OTP mới đã được gửi!");
      setTimer(60); 
      setOtp(new Array(6).fill("")); 
      inputRefs.current[0].focus();
    } catch (err) {
      alert(err.response?.data?.message || "Không thể gửi lại mã");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e, index) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (!val) {
        let newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
        return;
    }
    
    let newOtp = [...otp];
    newOtp[index] = val.substring(val.length - 1);
    setOtp(newOtp);

    if (index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1].focus();
      }
      let newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
    }
  };

  const handleVerify = async () => {
    const finalOtp = otp.join("");
    if (finalOtp.length < 6) return alert("Vui lòng nhập đủ 6 số!");
    
    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/auth/verify-otp", { email, otp: finalOtp });
      alert("Xác thực thành công!");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Mã OTP không chính xác");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-page-container">
      <div className="top-header-bar">
          <span className="header-icon">👜</span>
          <span className="header-icon">👤</span>
      </div>

      <div className="otp-wrapper">
        <div className="otp-card-custom">
          <h2 className="otp-title-text">Xác thực mã OTP</h2>
          
          <p className="otp-subtitle-text">
            Vui lòng nhập mã OTP đã được gửi đến email:<br/>
            <strong>{email}</strong>
          </p>

          <div className="otp-input-group-wrapper">
            {otp.map((data, index) => (
              <div key={index} className="otp-input-container">
                <input
                  type="text"
                  maxLength="1"
                  ref={(el) => (inputRefs.current[index] = el)}
                  value={data}
                  onChange={(e) => handleChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="otp-circle-input"
                />
                {!data && <div className="otp-dot-decorator"></div>}
              </div>
            ))}
          </div>

          <button 
            className="otp-btn-submit"
            onClick={handleVerify}
            disabled={loading}
          >
            {loading ? "ĐANG XỬ LÝ..." : "XÁC NHẬN"}
          </button>

          <div className="otp-footer-links">
            <p 
              className={`resend-link ${timer > 0 ? "disabled" : "active"}`} 
              onClick={handleResend}
              style={{ 
                cursor: timer > 0 ? "default" : "pointer", 
                opacity: timer > 0 ? 0.5 : 1,
                textDecoration: timer > 0 ? "none" : "underline"
              }}
            >
              GỬI LẠI MÃ {timer > 0 && `(${timer}s)`}
            </p>
            
            <p className="back-link" onClick={() => navigate("/register")}>← QUAY LẠI</p>
          </div>

          <div className="otp-decor-container">
            <div className="otp-decor-bar bar-left"></div>
            <div className="otp-decor-box">
              <div className="otp-inner-circle"></div>
            </div>
            <div className="otp-decor-bar bar-right"></div>
          </div>
        </div>
      </div>
    </div>
  );
}