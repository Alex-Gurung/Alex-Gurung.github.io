(window.webpackJsonp=window.webpackJsonp||[]).push([[0],{13:function(e,a,t){},15:function(e,a,t){"use strict";t.r(a);var n=t(0),r=t.n(n),i=t(7),l=t.n(i),o=(t(13),t(1)),c=t(2),s=t(4),m=t(3),u=t(5),p=function(e){function a(){return Object(o.a)(this,a),Object(s.a)(this,Object(m.a)(a).apply(this,arguments))}return Object(u.a)(a,e),Object(c.a)(a,[{key:"render",value:function(){var e=this.props.resumeData;return r.a.createElement(r.a.Fragment,null,r.a.createElement("header",{id:"home"},r.a.createElement("nav",{id:"nav-wrap"},r.a.createElement("a",{className:"mobile-btn",href:"#nav-wrap",title:"Show navigation"},"Show navigation"),r.a.createElement("a",{className:"mobile-btn",href:"#",title:"Hide navigation"},"Hide navigation"),r.a.createElement("ul",{id:"nav",className:"nav"},r.a.createElement("li",{className:"current"},r.a.createElement("a",{className:"smoothscroll",href:"#home"},"Home")),r.a.createElement("li",null,r.a.createElement("a",{className:"smoothscroll",href:"#about"},"About")),r.a.createElement("li",null,r.a.createElement("a",{className:"smoothscroll",href:"#resume"},"Resume")))),r.a.createElement("div",{className:"row banner"},r.a.createElement("div",{className:"banner-text"},r.a.createElement("h1",{className:"responsive-headline"},e.name,"."),r.a.createElement("h3",{style:{color:"#fff",fontFamily:"sans-serif "}},e.roleDescription),r.a.createElement("hr",null),r.a.createElement("ul",{className:"social"},e.socialLinks&&e.socialLinks.map(function(e){return r.a.createElement("li",{key:e.name},r.a.createElement("a",{href:e.url,target:"_blank"},r.a.createElement("i",{className:e.className})))})))),r.a.createElement("p",{className:"scrolldown"},r.a.createElement("a",{className:"smoothscroll",href:"#about"},r.a.createElement("i",{className:"icon-down-circle"})))))}}]),a}(n.Component),h=function(e){function a(){return Object(o.a)(this,a),Object(s.a)(this,Object(m.a)(a).apply(this,arguments))}return Object(u.a)(a,e),Object(c.a)(a,[{key:"render",value:function(){var e=this.props.resumeData;return r.a.createElement("section",{id:"about"},r.a.createElement("div",{className:"row"},r.a.createElement("div",{className:"three columns"},r.a.createElement("img",{className:"profile-pic",src:"images/profilepic.jpg",alt:""})),r.a.createElement("div",{className:"nine columns main-col"},r.a.createElement("h1",{style:{color:"white"}},"About Me"),r.a.createElement("h6",{style:{color:"white"}},e.aboutme))))}}]),a}(n.Component),d=function(e){function a(){return Object(o.a)(this,a),Object(s.a)(this,Object(m.a)(a).apply(this,arguments))}return Object(u.a)(a,e),Object(c.a)(a,[{key:"render",value:function(){var e=this.props.resumeData,a=e.language_dict,t=(Object.values(a).reduce(function(e,a){return e+a},0),Math.min(Object.values(a)),[]);for(var n in a){var i=a[n]/6e5;"Java"===n&&(i=a[n]/1e7);var l=Math.round(a[n]/1e3)+"k";t.push({language:n,percent:i,total:l})}return t=t.sort(function(e,a){var t=e.percent;return a.percent-t}),r.a.createElement("section",{id:"resume"},r.a.createElement("div",{className:"row education"},r.a.createElement("div",{className:"three columns header-col"},r.a.createElement("h1",null,r.a.createElement("span",null,"Education"))),r.a.createElement("div",{className:"nine columns main-col"},e.education&&e.education.map(function(e){var a=r.a.createElement("span",null);e.MonthEnded&&(a=r.a.createElement("span",null,"- ",e.MonthEnded," ",e.YearEnded," "));var t=r.a.createElement("span",null);e.Achievements&&(t=r.a.createElement("div",null,r.a.createElement("h6",null,"Achievements"),r.a.createElement("p",null,e.Achievements)));var n=r.a.createElement("span",null);return e.relevantCoursework&&(n=r.a.createElement("div",null,r.a.createElement("h6",null,"Relevant Coursework"),r.a.createElement("p",null,e.relevantCoursework))),r.a.createElement("div",{className:"row item"},r.a.createElement("div",{className:"twelve columns"},r.a.createElement("h3",null,e.UniversityName),r.a.createElement("p",{className:"info"},e.specialization,r.a.createElement("span",null,"\u2022")," ",r.a.createElement("em",{className:"date"},e.MonthOfPassing," ",e.YearOfPassing," ",a)),n,t))}))),r.a.createElement("div",{className:"row work"},r.a.createElement("div",{className:"three columns header-col"},r.a.createElement("h1",null,r.a.createElement("span",null,"Work"))),r.a.createElement("div",{className:"nine columns main-col"},e.work&&e.work.map(function(e){var a=r.a.createElement("span",null);return e.MonthEnded&&(a=r.a.createElement("span",null,"- ",e.MonthEnded," ",e.YearEnded," ")),r.a.createElement("div",{className:"row item"},r.a.createElement("div",{className:"twelve columns"},r.a.createElement("h3",null,e.CompanyName),r.a.createElement("p",{className:"info"},e.specialization,r.a.createElement("span",null,"\u2022")," ",r.a.createElement("em",{className:"date"},e.MonthOfLeaving," ",e.YearOfLeaving," ",a)),r.a.createElement("p",null,e.Achievements)))}))),r.a.createElement("div",{className:"row skill"},r.a.createElement("div",{className:"three columns header-col"},r.a.createElement("h1",null,r.a.createElement("span",null,"Skills"))),r.a.createElement("div",{className:"nine columns main-col"},r.a.createElement("h3",null,e.skillsDescription),r.a.createElement("div",{className:"bars"},r.a.createElement("ul",{className:"skills"},t.map(function(e){var a=e.language,t=e.percent,n=e.total;return r.a.createElement("li",null,r.a.createElement("span",{className:"bar-expand ".concat(a),style:{width:100*t+"%"}}),r.a.createElement("em",null,a," ",n," lines"))}))))))}}]),a}(n.Component),g=function(e){function a(){return Object(o.a)(this,a),Object(s.a)(this,Object(m.a)(a).apply(this,arguments))}return Object(u.a)(a,e),Object(c.a)(a,[{key:"render",value:function(){var e=this.props.resumeData;return r.a.createElement("section",{id:"portfolio"},r.a.createElement("div",{className:"row"},r.a.createElement("div",{className:"twelve columns collapsed"},r.a.createElement("h1",{style:{fontSize:"3rem"}},"Here's My\xa0",r.a.createElement("span",null,r.a.createElement("a",{target:"_blank",href:"static/Alexander_Gurung_resume_May2020.pdf",style:{textDecoration:"none"}},"Resume!"))),r.a.createElement("div",{id:"portfolio-wrapper",className:"bgrid-quarters s-bgrid-thirds cf"},e.portfolio&&e.portfolio.map(function(e){return r.a.createElement("div",null)})))))}}]),a}(n.Component),E=(n.Component,n.Component,function(e){function a(){return Object(o.a)(this,a),Object(s.a)(this,Object(m.a)(a).apply(this,arguments))}return Object(u.a)(a,e),Object(c.a)(a,[{key:"render",value:function(){var e=this.props.resumeData;return r.a.createElement("footer",null,r.a.createElement("div",{className:"row"},r.a.createElement("div",{className:"twelve columns"},r.a.createElement("ul",{className:"social-links"},e.socialLinks&&e.socialLinks.map(function(e){return r.a.createElement("li",null,r.a.createElement("a",{href:e.url},r.a.createElement("i",{className:e.className})))}))),r.a.createElement("div",{id:"go-top"},r.a.createElement("a",{className:"smoothscroll",title:"Back to Top",href:"#home"},r.a.createElement("i",{className:"icon-up-open"})))))}}]),a}(n.Component)),f={imagebaseurl:"https://alex-gurung.github.io/",name:"Alex Gurung",role:"Backend Developer/Data Scientist",linkedinId:"alexandergurung",roleDescription:"Hi! I'm a backend developer (although I have full-stack experience) and Machine Learning Researcher who's hoping to pursue a career in Machine Learning and Data Science! I'm currently looking for both summer internships and full-time opportunities!",socialLinks:[{name:"linkedin",url:"https://www.linkedin.com/in/alexandergurung",className:"fa fa-linkedin"},{name:"github",url:"http://github.com/alex-gurung",className:"fa fa-github"}],aboutme:"I'm a Computer Science major at Georgia Tech set to graduate Fall 2020 with a Bachelor's of Science in CS and a Minor in Linguistics. I've begun my Master's at Georgia Tech through the BSMS program and am hoping to graduate in Spring 2022. In the meantime I'm looking for summer internship or co-op opportunities!",website:"https://alex-gurung.github.io",education:[{UniversityName:"Georgia Institute of Technology",specialization:"MS in Computer Science",secondSpecialization:"",MonthOfPassing:"Aug",YearOfPassing:"2020",MonthEnded:"Apr",YearEnded:"2022 (predicted)",Achievements:"",relevantCoursework:""},{UniversityName:"Georgia Institute of Technology",specialization:"BS in Computer Science - Linguistics Minor",secondSpecialization:"",MonthOfPassing:"Aug",YearOfPassing:"2018",MonthEnded:"Dec",YearEnded:"2020 (predicted)",Achievements:"Member of Honors Program, Undergraduate Researcher in Computational Social Science",relevantCoursework:"Data Structures & Algorithms, Discrete Mathematics, Object Oriented Programming, AGILE Development, Machine Learning, Computational Linguistics, Probability & Statistics"},{UniversityName:"Thomas Jefferson High School for Science and Technology",MonthOfPassing:"Sept",YearOfPassing:"2014",MonthEnded:"Aug",YearEnded:"2018",Achievements:"President of Linguistics Club and Development Club, Member of Mobile & Web Development Research Lab",relevantCoursework:"Artificial Intelligence, Mobile & Web App Development"}],work:[{CompanyName:"The Home Depot",specialization:"Software Engineer Intern",MonthOfLeaving:"Feb",YearOfLeaving:"2020",MonthEnded:"May",YearEnded:"2020",Achievements:"I worked on a 3 person team and created a proof-of-concept recommender system using a combination of NLP and Object-Detection techniques. To that end we trained a DistilBert classifier and Inception V3 model and showed that their results outperformed the current system."},{CompanyName:"Computational Social Science Lab",specialization:"Undergraduate Researcher",MonthOfLeaving:"Oct",YearOfLeaving:"2019",MonthEnded:"present",Achievements:"I'm currently working on a research team analysing twitter-based complaints concerning transportation. We perform topic modeling and train classifiers on twitter data to help inform transportation and infrastructure policy."},{CompanyName:"Monotto",specialization:"Backend/Data Science Developer",MonthOfLeaving:"Jun",YearOfLeaving:"2019",MonthEnded:"present",Achievements:"I work as a developer for Monotto, a fintech company based in Atlanta. I helped launch our flagship product, implementing backend algorithms and models. I'm currently leading the development of our new product, for which I'm using simple Data Science techniques to analyse financial transaction data."},{CompanyName:"Automated Algorithm Design Research Lab",specialization:"Undergraduate Researcher",MonthOfLeaving:"Jan",YearOfLeaving:"2019",MonthEnded:"present",Achievements:"For the past year I've been working for a research lab on campus associated with the Georgia Tech Research Institute (GTRI). I personally have worked on improving the efficiency of cache invalidation and implementing Natural Language Processing techniques within the Lab's framework."}],language_dict:{HTML:16182,Dart:30064,Java:9645644,JavaScript:346655,CSS:4410,Python:450486,Go:27385,"C++":1339},skillsDescription:"Skills (by lines of code in Github)",skills:[{skillname:"HTML5"},{skillname:"CSS"},{skillname:"Reactjs"}],portfolio:[{name:"Arbitrary Style Transfer",description:"Mobile App to Perform Neural Style Transfer",imgurl:"images/pastiche.jpg"},{name:"Lighthouse",description:"Hackathon project to provide rapid housing to those in crisis",imgurl:"images/lighthouse.png"},{name:"project3",description:"mobileapp",imgurl:"images/portfolio/project2.png"},{name:"project4",description:"mobileapp",imgurl:"images/portfolio/phone.jpg"}]},v=function(e){function a(){return Object(o.a)(this,a),Object(s.a)(this,Object(m.a)(a).apply(this,arguments))}return Object(u.a)(a,e),Object(c.a)(a,[{key:"render",value:function(){return r.a.createElement("div",{className:"App"},r.a.createElement(p,{resumeData:f}),r.a.createElement(h,{resumeData:f}),r.a.createElement(d,{resumeData:f}),r.a.createElement(g,{resumeData:f}),r.a.createElement(E,{resumeData:f}))}}]),a}(n.Component);Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));l.a.render(r.a.createElement(v,null),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then(function(e){e.unregister()})},8:function(e,a,t){e.exports=t(15)}},[[8,2,1]]]);
//# sourceMappingURL=main.473a7586.chunk.js.map