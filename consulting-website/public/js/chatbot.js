document.addEventListener('DOMContentLoaded', function() {
  const userData = {
    name: "",
    email: "",
    phone: "",
    currentRole: "",
    careerGoal: "",
    experienceLevel: "",
    preferredLearning: "",
    interests: [],
    painPoints: [],
    conversation: [],
    lastActive: new Date().toISOString()
  };

  const botResponses = {
    greeting: [
      "👋 Hello! I'm GRP Career Assistant. I'd love to help you with your career journey. What's your name?", 
      "Welcome to GRP Career Consultancy! 😊 To get started, may I know your name?"
    ],
    nameRequest: [
      "Nice to meet you, {name}! Could you share your email address so we can send you personalized career resources?", 
      "Thanks, {name}! What's a good email address to reach you with career opportunities?"
    ],
    emailRequest: [
      "Great! For quick updates, could you also share your phone number? (We promise no spam!)", 
      "Perfect! We sometimes share time-sensitive career opportunities. What's your phone number for quick alerts?"
    ],
    phoneRequest: [
      "Thank you! To better assist you, could you tell me your current role or job title?", 
      "Got it! What's your current professional role or position?"
    ],
    currentRoleRequest: [
      "Thanks for sharing! What's your primary career goal right now? (e.g., promotion, career change, skill development)", 
      "Understood! What are you hoping to achieve in your career in the next 6-12 months?"
    ],
    careerGoalRequest: [
      "Interesting! How many years of professional experience do you have in your field?", 
      "Got it! Would you describe yourself as entry-level, mid-career, or senior professional?"
    ],
    experienceRequest: [
      "Almost done! Do you prefer learning through online courses, in-person workshops, or coaching sessions?", 
      "Final question! What's your preferred way to develop new skills? (e.g., self-paced online, live training, 1-on-1 coaching)"
    ],
    learningPreferenceRequest: [
      "🎉 Thank you for sharing! Based on your inputs, I'd recommend exploring our {recommendation}. Would you like me to send more details to your email?", 
      "✅ Great! Our {recommendation} program would be perfect for you. Should I have a career advisor contact you?"
    ],
    serviceOptions: [
      "Here are services that might help you:\n\n" +
      "💼 <strong>Resume Masterclass</strong> - Transform your resume in 7 days\n" +
      "🎤 <strong>Interview Bootcamp</strong> - Ace any interview with confidence\n" +
      "🗺️ <strong>Career Roadmap</strong> - Personalized 5-year career plan\n\n" +
      "Which one interests you most?",
      
      "Based on your goals, consider these options:\n\n" +
      "📈 <strong>Career Acceleration</strong> - Fast-track promotions\n" +
      "🔄 <strong>Career Transition</strong> - Switch industries smoothly\n" +
      "🌟 <strong>Executive Presence</strong> - Leadership development\n\n" +
      "Want to explore any of these?"
    ],
    specificServiceInfo: {
      "resume": "Our <strong>Resume Masterclass</strong> helps you craft an ATS-friendly resume that gets interviews. It includes:\n- Custom templates\n- Keyword optimization\n- Achievement-focused writing\n- 5 resume reviews\n\nInterested in joining?",
      "interview": "The <strong>Interview Bootcamp</strong> prepares you for any interview format:\n- Mock interviews with feedback\n- STAR method training\n- Salary negotiation tactics\n- 30+ common questions mastered\n\nWant to practice with us?",
      "career": "Our <strong>Career Roadmap</strong> gives you:\n- Personalized 5-year plan\n- Skills gap analysis\n- Industry trends report\n- Mentor matching\n\nReady to map your future?"
    },
    pricingInfo: [
      "Our programs range from $99 for single workshops to $999 for comprehensive packages. Financial aid is available for qualified candidates.",
      "We offer flexible pricing:\n- $99-$299 for individual courses\n- $499-$999 for certification programs\n- Custom corporate rates available\n\nWhat budget range works for you?"
    ],
    contactInfo: [
      "You can reach our team at:\n📧 help@grpcareers.com\n📞 (800) 555-9876\n🏢 123 Career Lane, Suite 456, New York, NY",
      "Contact options:\n- Email: support@grpcareers.com\n- Phone: (800) 555-9876 (Mon-Fri 9am-6pm EST)\n- Live chat on our website"
    ],
    farewell: [
      "Thank you! Our career advisor will contact you within 24 hours. Check your email for resources in the meantime! 🚀", 
      "All set! We'll be in touch soon with personalized recommendations. Wishing you career success! 🌟"
    ],
    default: [
      "How can I assist with your career development today?", 
      "What aspect of your career would you like to improve?",
      "Is there a specific career challenge you're facing?"
    ],
    error: [
      "I didn't quite catch that. Could you rephrase?", 
      "Hmm, I'm not sure I understand. Could you explain differently?"
    ]
  };

  const serviceRecommendations = {
    "entry-level": "Career Launchpad Program",
    "mid-career": "Career Accelerator",
    "senior": "Executive Leadership Program",
    "promotion": "Advancement Track",
    "career change": "Transition Masterclass",
    "skill development": "Skill Builder Intensive"
  };

  const chatbotContainer = document.getElementById('chatbot-container');
  const chatbotMessages = document.getElementById('chatbot-messages');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-message');
  const toggleButton = document.getElementById('chatbot-toggle');
  const closeButton = document.getElementById('chatbot-close');
  
  let conversationStage = 0;
  let isWaitingForResponse = false;
  let currentQuickReplies = [];

  toggleButton.addEventListener('click', () => {
    chatbotContainer.classList.toggle('active');
    if (chatbotContainer.classList.contains('active') && conversationStage === 0) {
      setTimeout(() => {
        addMessage('bot', getRandomResponse(botResponses.greeting));
      }, 600);
    }
  });

  closeButton.addEventListener('click', () => {
    chatbotContainer.classList.remove('active');
  });

  function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    return /^[\d\s\-()+]{10,}$/.test(phone);
  }

  function addMessage(sender, text, isQuickReply = false) {
    if (isWaitingForResponse && !isQuickReply) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    
    if (typeof text === 'string') {
      messageDiv.innerHTML = text.replace(/{name}/g, userData.name);
    } else {
      messageDiv.appendChild(text);
    }
    
    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    
    if (sender === 'user') {
      const timestamp = document.createElement('div');
      timestamp.classList.add('timestamp');
      timestamp.style.fontSize = '10px';
      timestamp.style.opacity = '0.6';
      timestamp.style.textAlign = 'right';
      timestamp.style.marginTop = '4px';
      timestamp.style.marginRight = '4px';
      
      const now = new Date();
      timestamp.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      messageDiv.appendChild(timestamp);
    }
  }

  function showTypingIndicator() {
    if (isWaitingForResponse) return;
    
    isWaitingForResponse = true;
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('typing-indicator');
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    chatbotMessages.appendChild(typingDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  function hideTypingIndicator() {
    const typingDiv = document.getElementById('typing-indicator');
    if (typingDiv) {
      typingDiv.remove();
    }
    isWaitingForResponse = false;
  }

  function getRandomResponse(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function addQuickReplies(replies) {
    currentQuickReplies = replies;
    const container = document.createElement('div');
    container.classList.add('quick-replies');
    
    replies.forEach(reply => {
      const button = document.createElement('button');
      button.classList.add('quick-reply');
      button.textContent = reply;
      button.addEventListener('click', () => {
        document.querySelectorAll('.quick-replies').forEach(el => el.remove());
        addMessage('user', reply);
        processMessage(reply);
      });
      container.appendChild(button);
    });
    
    addMessage('bot', container, true);
  }

  function processMessage(message) {
    showTypingIndicator();
    
    setTimeout(() => {
      hideTypingIndicator();
      let response;
      let quickReplies = [];
      
      switch(conversationStage) {
        case 0:
          userData.name = message;
          userData.conversation.push({sender: 'user', message: message});
          response = getRandomResponse(botResponses.nameRequest).replace(/{name}/g, userData.name);
          conversationStage = 1;
          break;
          
        case 1:
          if (validateEmail(message)) {
            userData.email = message;
            userData.conversation.push({sender: 'user', message: message});
            response = getRandomResponse(botResponses.emailRequest);
            conversationStage = 2;
          } else {
            response = "🔍 That email doesn't look quite right. Please enter a valid email (e.g., example@domain.com)";
          }
          break;
          
        case 2:
          if (validatePhone(message)) {
            userData.phone = message;
            userData.conversation.push({sender: 'user', message: message});
            response = getRandomResponse(botResponses.phoneRequest);
            conversationStage = 3;
          } else {
            response = "📱 Please enter a valid phone number (at least 10 digits)";
          }
          break;
          
        case 3:
          userData.currentRole = message;
          userData.conversation.push({sender: 'user', message: message});
          response = getRandomResponse(botResponses.currentRoleRequest);
          quickReplies = ["Promotion", "Career change", "Skill development"];
          conversationStage = 4;
          break;
          
        case 4:
          userData.careerGoal = message.toLowerCase();
          userData.conversation.push({sender: 'user', message: message});
          response = getRandomResponse(botResponses.careerGoalRequest);
          quickReplies = ["Entry-level", "Mid-career", "Senior"];
          conversationStage = 5;
          break;
          
        case 5:
          userData.experienceLevel = message.toLowerCase();
          userData.conversation.push({sender: 'user', message: message});
          response = getRandomResponse(botResponses.experienceRequest);
          quickReplies = ["Online courses", "In-person workshops", "Coaching"];
          conversationStage = 6;
          break;
          
        case 6:
          userData.preferredLearning = message.toLowerCase();
          userData.conversation.push({sender: 'user', message: message});
          
          let recommendation = serviceRecommendations[userData.experienceLevel] || 
                             serviceRecommendations[userData.careerGoal] || 
                             "Career Success Program";
          
          response = getRandomResponse(botResponses.learningPreferenceRequest)
            .replace(/{recommendation}/g, recommendation)
            .replace(/{recommendation}/g, recommendation);
          
          quickReplies = ["Yes, please!", "More info first"];
          conversationStage = 7;
          break;
          
        case 7:
          userData.conversation.push({sender: 'user', message: message});
          const msg = message.toLowerCase();
          
          if (msg.includes('resume') || msg.includes('cv')) {
            response = botResponses.specificServiceInfo["resume"];
            userData.interests.push("resume services");
            quickReplies = ["Join Masterclass", "See pricing", "Contact advisor"];
          } 
          else if (msg.includes('interview') || msg.includes('prepare')) {
            response = botResponses.specificServiceInfo["interview"];
            userData.interests.push("interview preparation");
            quickReplies = ["Start Bootcamp", "Pricing info", "Talk to expert"];
          }
          else if (msg.includes('career') || msg.includes('plan')) {
            response = botResponses.specificServiceInfo["career"];
            userData.interests.push("career planning");
            quickReplies = ["Get Roadmap", "Cost?", "Schedule call"];
          }
          else if (msg.includes('price') || msg.includes('cost')) {
            response = getRandomResponse(botResponses.pricingInfo);
            quickReplies = ["Workshops", "Programs", "Contact us"];
          }
          else if (msg.includes('contact') || msg.includes('reach')) {
            response = getRandomResponse(botResponses.contactInfo);
            quickReplies = ["Services", "Pricing", "Website"];
          }
          else if (msg.includes('service') || msg.includes('offer')) {
            response = getRandomResponse(botResponses.serviceOptions);
            quickReplies = ["Resume", "Interview", "Career Plan"];
          }
          else if (msg.includes('start over') || msg.includes('reset')) {
            response = '🔄 Okay, let\'s start fresh. What\'s your name?';
            conversationStage = 0;
            userData.name = "";
            userData.email = "";
            userData.phone = "";
            userData.currentRole = "";
            userData.careerGoal = "";
            userData.experienceLevel = "";
            userData.preferredLearning = "";
          }
          else if (msg.includes('thank') || msg.includes('bye')) {
            response = "You're welcome! 😊 Is there anything else I can help with before you go?";
            quickReplies = ["Yes, one more thing", "No, that's all"];
          }
          else {
            response = getRandomResponse(botResponses.default);
            quickReplies = ["Services", "Pricing", "Contact"];
          }
          break;
          
        default:
          response = getRandomResponse(botResponses.error);
      }
      
      addMessage('bot', response);
      userData.conversation.push({sender: 'bot', message: response});
      
      if (quickReplies.length > 0) {
        setTimeout(() => {
          addQuickReplies(quickReplies);
        }, 500);
      }
      
      if (conversationStage === 7 || message.toLowerCase().includes('bye')) {
        saveConversation();
      }
    }, 1000 + Math.random() * 1500);
  }

  function saveConversation() {
    const conversationData = {
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      currentRole: userData.currentRole,
      careerGoal: userData.careerGoal,
      experienceLevel: userData.experienceLevel,
      preferredLearning: userData.preferredLearning,
      interests: userData.interests.join(', '),
      painPoints: userData.painPoints.join(', '),
      conversation: JSON.stringify(userData.conversation),
      lastActive: new Date().toISOString()
    };

    const savingDiv = document.createElement('div');
    savingDiv.classList.add('message', 'bot-message');
    savingDiv.innerHTML = "💾 Saving your information...";
    chatbotMessages.appendChild(savingDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    
    fetch('/save-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        interests: userData.interests.join(', '),
        conversation: userData.conversation
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        savingDiv.innerHTML = "✅ Your information has been saved successfully!";
        console.log('Chat saved with ID:', data.chatId);
      } else {
        savingDiv.innerHTML = "❌ There was an error saving your information. Please try again.";
        console.error('Error:', data.error);
      }
      chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    })
    .catch(error => {
      console.error('Error saving conversation:', error);
      savingDiv.innerHTML = "❌ There was an error saving your information. Please try again.";
      chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    });
  }

  function sendMessage() {
    const message = sanitizeInput(userInput.value.trim());
    if (!message) {
      userInput.focus();
      return;
    }

    addMessage('user', message);
    processMessage(message);
    userInput.value = '';
    userInput.focus();
  }

  sendButton.addEventListener('click', sendMessage);
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  let inactivityTimer;
  function startInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      if (!chatbotContainer.classList.contains('active')) {
        toggleButton.classList.add('pulse');
      }
    }, 30000);
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(94, 114, 228, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(94, 114, 228, 0); }
      100% { box-shadow: 0 0 0 0 rgba(94, 114, 228, 0); }
    }
    #chatbot-toggle.pulse {
      animation: pulse 2s infinite;
    }
  `;
  document.head.appendChild(style);

  document.addEventListener('mousemove', startInactivityTimer);
  document.addEventListener('click', startInactivityTimer);
  startInactivityTimer();

  toggleButton.addEventListener('click', () => {
    toggleButton.classList.remove('pulse');
  });
});