/* CareerFlow built-in Demo Data. Dates are calculated relative to the day the app opens. */
(function () {
  "use strict";

  function dateOffset(daysAgo) {
    var date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - daysAgo);
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  window.CAREERFLOW_DEMO_DATA = {
    label: "Demo Data",
    applications: [
      {
        id: "demo-applied-followup",
        company: "Northstar Studio",
        title: "Junior Product Designer",
        status: "Applied",
        date: dateOffset(16),
        isDemo: true
      },
      {
        id: "demo-screening",
        company: "Willow & Pine Works",
        title: "Project Coordinator",
        status: "Screening",
        date: dateOffset(7),
        isDemo: true
      },
      {
        id: "demo-interview",
        company: "Cedar Labs",
        title: "Data Support Specialist",
        status: "Interview",
        date: dateOffset(16),
        isDemo: true
      },
      {
        id: "demo-offer",
        company: "Lumen Path Collective",
        title: "Operations Associate",
        status: "Offer",
        date: dateOffset(2),
        isDemo: true
      },
      {
        id: "demo-rejected",
        company: "Harbor Field Partners",
        title: "Communications Assistant",
        status: "Rejected",
        date: dateOffset(23),
        isDemo: true
      }
    ],
    careerRoles: [
      {
        id: "demo-role-product",
        title: "Junior Product Designer",
        description: "Help a small product team turn user needs into clear, accessible digital experiences.",
        updated: "Demo Data · Updated recently",
        requirements: ["Portfolio with process examples", "Basic prototyping skills", "Clear communication"],
        jobDescription: "Junior Product Designer role. We are looking for a candidate with a portfolio that shows design process, basic prototyping skills, user research awareness, clear communication, teamwork, and a bachelor's degree or equivalent learning evidence."
      },
      {
        id: "demo-role-data",
        title: "Data Support Specialist",
        description: "Support teams by organizing information, checking data quality, and sharing clear findings.",
        updated: "Demo Data · Updated recently",
        requirements: ["Spreadsheet and SQL fundamentals", "Attention to detail", "Experience explaining findings"],
        jobDescription: "Data Support Specialist role. The role values spreadsheet skills, SQL fundamentals, data analysis, attention to detail, problem solving, communication, and 1+ years of relevant experience or project evidence."
      },
      {
        id: "demo-role-project",
        title: "Project Coordinator",
        description: "Keep a cross-functional team aligned through organized plans, updates, and thoughtful follow-through.",
        updated: "Demo Data · Updated recently",
        requirements: ["Project coordination fundamentals", "Written communication", "Organization and teamwork"],
        jobDescription: "Project Coordinator role. Candidates should demonstrate project coordination, organization, written communication, teamwork, stakeholder communication, Microsoft Excel or equivalent spreadsheet skills, and experience managing deadlines."
      },
      {
        id: "demo-role-content",
        title: "Content & Community Assistant",
        description: "Create useful content and help a community receive timely, thoughtful communication.",
        updated: "Demo Data · Updated recently",
        requirements: ["Writing samples or portfolio", "Social media familiarity", "Communication and empathy"],
        jobDescription: "Content and Community Assistant role. We welcome candidates with writing samples or a portfolio, content writing, social media familiarity, English communication, empathy, organization, teamwork, and a diploma, bachelor's degree, or equivalent learning evidence."
      }
    ]
  };
}());
