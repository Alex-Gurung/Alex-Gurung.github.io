(window.webpackJsonp=window.webpackJsonp||[]).push([[0],{13:function(e,a,t){},15:function(e,a,t){"use strict";t.r(a);var n=t(0),r=t.n(n),l=t(7),i=t.n(l),c=(t(13),t(1)),o=t(2),s=t(4),m=t(3),u=t(5),p=function(e){function a(){return Object(c.a)(this,a),Object(s.a)(this,Object(m.a)(a).apply(this,arguments))}return Object(u.a)(a,e),Object(o.a)(a,[{key:"render",value:function(){var e=this.props.resumeData;return r.a.createElement(r.a.Fragment,null,r.a.createElement("header",{id:"home"},r.a.createElement("nav",{id:"nav-wrap"},r.a.createElement("a",{className:"mobile-btn",href:"#nav-wrap",title:"Show navigation"},"Show navigation"),r.a.createElement("a",{className:"mobile-btn",href:"#",title:"Hide navigation"},"Hide navigation"),r.a.createElement("ul",{id:"nav",className:"nav"},r.a.createElement("li",{className:"current"},r.a.createElement("a",{className:"smoothscroll",href:"#home"},"Home")),r.a.createElement("li",null,r.a.createElement("a",{className:"smoothscroll",href:"#about"},"About")),r.a.createElement("li",null,r.a.createElement("a",{className:"smoothscroll",href:"#resume"},"Resume")))),r.a.createElement("div",{className:"row banner"},r.a.createElement("div",{className:"banner-text"},r.a.createElement("h1",{className:"responsive-headline"},e.name,"."),r.a.createElement("h3",{style:{color:"#fff",fontFamily:"sans-serif "}},e.roleDescription),r.a.createElement("hr",null),r.a.createElement("ul",{className:"social"},e.socialLinks&&e.socialLinks.map(function(e){return r.a.createElement("li",{key:e.name},r.a.createElement("a",{href:e.url,target:"_blank"},r.a.createElement("i",{className:e.className})))})))),r.a.createElement("p",{className:"scrolldown"},r.a.createElement("a",{className:"smoothscroll",href:"#about"},r.a.createElement("i",{className:"icon-down-circle"})))))}}]),a}(n.Component),h=function(e){function a(){return Object(c.a)(this,a),Object(s.a)(this,Object(m.a)(a).apply(this,arguments))}return Object(u.a)(a,e),Object(o.a)(a,[{key:"render",value:function(){var e=this.props.resumeData;return r.a.createElement("section",{id:"about"},r.a.createElement("div",{className:"row"},r.a.createElement("div",{className:"three columns"},r.a.createElement("img",{className:"profile-pic",src:"images/profilepic.jpg",alt:""})),r.a.createElement("div",{className:"nine columns main-col"},r.a.createElement("h1",{style:{color:"white"}},"About Me"),r.a.createElement("h6",{style:{color:"white"}},e.aboutme))))}}]),a}(n.Component),d=function(e){function a(){return Object(c.a)(this,a),Object(s.a)(this,Object(m.a)(a).apply(this,arguments))}return Object(u.a)(a,e),Object(o.a)(a,[{key:"render",value:function(){var e=this.props.resumeData,a=e.language_dict,t=(Object.values(a).reduce(function(e,a){return e+a},0),Math.min(Object.values(a)),[]);for(var n in a){var l=a[n]/6e5;"Java"===n&&(l=a[n]/1e7);var i=Math.round(a[n]/1e3)+"k";t.push({language:n,percent:l,total:i})}return t=t.sort(function(e,a){var t=e.percent;return a.percent-t}),r.a.createElement("section",{id:"resume"},r.a.createElement("div",{className:"row education"},r.a.createElement("div",{className:"three columns header-col"},r.a.createElement("h1",null,r.a.createElement("span",null,"Education"))),r.a.createElement("div",{className:"nine columns main-col"},e.education&&e.education.map(function(e){var a=r.a.createElement("span",null);return e.MonthEnded&&(a=r.a.createElement("span",null,"- ",e.MonthEnded," ",e.YearEnded," ")),r.a.createElement("div",{className:"row item"},r.a.createElement("div",{className:"twelve columns"},r.a.createElement("h3",null,e.UniversityName),r.a.createElement("p",{className:"info"},e.specialization,r.a.createElement("span",null,"\u2022")," ",r.a.createElement("em",{className:"date"},e.MonthOfPassing," ",e.YearOfPassing," ",a)),r.a.createElement("h6",null,"Relevant Coursework"),r.a.createElement("p",null,e.relevantCoursework),r.a.createElement("h6",null,"Achievements"),r.a.createElement("p",null,e.Achievements)))}))),r.a.createElement("div",{className:"row work"},r.a.createElement("div",{className:"three columns header-col"},r.a.createElement("h1",null,r.a.createElement("span",null,"Work"))),r.a.createElement("div",{className:"nine columns main-col"},e.work&&e.work.map(function(e){var a=r.a.createElement("span",null);return e.MonthEnded&&(a=r.a.createElement("span",null,"- ",e.MonthEnded," ",e.YearEnded," ")),r.a.createElement("div",{className:"row item"},r.a.createElement("div",{className:"twelve columns"},r.a.createElement("h3",null,e.CompanyName),r.a.createElement("p",{className:"info"},e.specialization,r.a.createElement("span",null,"\u2022")," ",r.a.createElement("em",{className:"date"},e.MonthOfLeaving," ",e.YearOfLeaving," ",a)),r.a.createElement("p",null,e.Achievements)))}))),r.a.createElement("div",{className:"row skill"},r.a.createElement("div",{className:"three columns header-col"},r.a.createElement("h1",null,r.a.createElement("span",null,"Skills"))),r.a.createElement("div",{className:"nine columns main-col"},r.a.createElement("h3",null,e.skillsDescription),r.a.createElement("div",{className:"bars"},r.a.createElement("ul",{className:"skills"},t.map(function(e){var a=e.language,t=e.percent,n=e.total;return r.a.createElement("li",null,r.a.createElement("span",{className:"bar-expand ".concat(a),style:{width:100*t+"%"}}),r.a.createElement("em",null,a," ",n," lines"))}))))))}}]),a}(n.Component),E=function(e){function a(){return Object(c.a)(this,a),Object(s.a)(this,Object(m.a)(a).apply(this,arguments))}return Object(u.a)(a,e),Object(o.a)(a,[{key:"render",value:function(){var e=this.props.resumeData;return r.a.createElement("section",{id:"portfolio"},r.a.createElement("div",{className:"row"},r.a.createElement("div",{className:"twelve columns collapsed"},r.a.createElement("h1",{style:{fontSize:"3rem"}},"Here's My\xa0",r.a.createElement("span",null,r.a.createElement("a",{target:"_blank",href:"static/Alexander_Gurung_resume_Sept2019.pdf",style:{textDecoration:"none"}},"Resume!"))),r.a.createElement("div",{id:"portfolio-wrapper",className:"bgrid-quarters s-bgrid-thirds cf"},e.portfolio&&e.portfolio.map(function(e){return r.a.createElement("div",null)})))))}}]),a}(n.Component),g=(n.Component,n.Component,function(e){function a(){return Object(c.a)(this,a),Object(s.a)(this,Object(m.a)(a).apply(this,arguments))}return Object(u.a)(a,e),Object(o.a)(a,[{key:"render",value:function(){var e=this.props.resumeData;return r.a.createElement("footer",null,r.a.createElement("div",{className:"row"},r.a.createElement("div",{className:"twelve columns"},r.a.createElement("ul",{className:"social-links"},e.socialLinks&&e.socialLinks.map(function(e){return r.a.createElement("li",null,r.a.createElement("a",{href:e.url},r.a.createElement("i",{className:e.className})))}))),r.a.createElement("div",{id:"go-top"},r.a.createElement("a",{className:"smoothscroll",title:"Back to Top",href:"#home"},r.a.createElement("i",{className:"icon-up-open"})))))}}]),a}(n.Component)),f={imagebaseurl:"https://alex-gurung.github.io/",name:"Alex Gurung",role:"Backend Developer/Data Scientist",linkedinId:"alexandergurung",roleDescription:"Hi! I'm a backend developer (although I have full-stack experience) who's hoping to pursue a career in Machine Learning and Data Science! I'm currently looking for both summer internships and full-time opportunities!",socialLinks:[{name:"linkedin",url:"https://www.linkedin.com/in/alexandergurung",className:"fa fa-linkedin"},{name:"github",url:"http://github.com/alex-gurung",className:"fa fa-github"}],aboutme:"I'm a Computer Science major at Georgia Tech set to graduate Fall 2020 with a Bachelor's of Science in CS and a Minor in Linguistics. I'm hoping to pursue graduate school but am looking for internships and/or full-time opportunities in the meantime!",website:"https://alex-gurung.github.io",education:[{UniversityName:"Georgia Institute of Technology",specialization:"BS in Computer Science - Linguistics Minor",secondSpecialization:"",MonthOfPassing:"Aug",YearOfPassing:"2018",MonthEnded:"Dec",YearEnded:"2020 (predicted)",Achievements:"Member of Honors Program, Member of Machine Learning and Data Science clubs, Undergraduate Researcher on campus",relevantCoursework:"Data Structures & Algorithms, Discrete Mathematics, Object Oriented Programming, AGILE Development, Machine Learning, Computational Linguistics, Probability & Statistics"},{UniversityName:"Thomas Jefferson High School for Science and Technology",MonthOfPassing:"Sept",YearOfPassing:"2014",MonthEnded:"Aug",YearEnded:"2018",Achievements:"President of Linguistics Club and Development Club, Member of Mobile & Web Development Research Lab",relevantCoursework:"Artificial Intelligence, Mobile & Web App Development"}],work:[{CompanyName:"Monotto",specialization:"Backend/Data Science Developer",MonthOfLeaving:"Jun",YearOfLeaving:"2019",MonthEnded:"present",Achievements:"I work as a developer for Monotto, a fintech company based in Atlanta. I helped launch our flagship product, implementing backend algorithms and models. I'm currently leading the development of our new product, for which I'm using simple Data Science techniques to analyse financial transaction data."},{CompanyName:"Automated Algorithm Design Research Lab",specialization:"Undergraduate Researcher",MonthOfLeaving:"Jan",YearOfLeaving:"2019",MonthEnded:"present",Achievements:"For the past year I've been working for a research lab on campus associated with the Georgia Tech Research Institute (GTRI). I personally have worked on improving the efficiency of cache invalidation and implementing Natural Language Processing techniques within the Lab's framework."}],language_dict:{HTML:16182,Dart:30064,Java:9645644,JavaScript:346655,CSS:4410,Python:450486,Go:27385,"C++":1339},skillsDescription:"Skills (by lines of code in Github)",skills:[{skillname:"HTML5"},{skillname:"CSS"},{skillname:"Reactjs"}],portfolio:[{name:"Arbitrary Style Transfer",description:"Mobile App to Perform Neural Style Transfer",imgurl:"images/pastiche.jpg"},{name:"Lighthouse",description:"Hackathon project to provide rapid housing to those in crisis",imgurl:"images/lighthouse.png"},{name:"project3",description:"mobileapp",imgurl:"images/portfolio/project2.png"},{name:"project4",description:"mobileapp",imgurl:"images/portfolio/phone.jpg"}]},v=function(e){function a(){return Object(c.a)(this,a),Object(s.a)(this,Object(m.a)(a).apply(this,arguments))}return Object(u.a)(a,e),Object(o.a)(a,[{key:"render",value:function(){return r.a.createElement("div",{className:"App"},r.a.createElement(p,{resumeData:f}),r.a.createElement(h,{resumeData:f}),r.a.createElement(d,{resumeData:f}),r.a.createElement(E,{resumeData:f}),r.a.createElement(g,{resumeData:f}))}}]),a}(n.Component);Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));i.a.render(r.a.createElement(v,null),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then(function(e){e.unregister()})},8:function(e,a,t){e.exports=t(15)}},[[8,2,1]]]);
//# sourceMappingURL=main.08bab41b.chunk.js.map