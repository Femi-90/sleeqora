import React from 'react';

const organizations = [
  {
    name: '3MTT',
    description: '3 Million Technical Talent',
    website: 'https://3mtt.nitda.gov.ng/',
    socials: [
      {
        label: 'Instagram',
        url: 'https://www.instagram.com/3mttnigeria/',
      },
      {
        label: 'X',
        url: 'https://x.com/3MTTNigeria',
      },
      {
        label: 'LinkedIn',
        url: 'https://www.linkedin.com/company/3mtt-nigeria/',
      },
    ],
  },
  {
    name: 'WESONLINE',
    description: 'Skills, mentorship and employability',
    website: 'https://app.wesonline.ng/',
    socials: [],
  },
  {
    name: 'FMCIDE',
    description: 'Federal Ministry of Communications, Innovation and Digital Economy',
    website: 'https://fmcide.gov.ng/',
    socials: [
      {
        label: 'X',
        url: 'https://x.com/FMCIDENigeria',
      },
    ],
  },
  {
    name: 'DEEPTECH',
    description: 'DeepTech Ready Programme',
    website: 'https://3mtt.nitda.gov.ng/deeptech/',
    socials: [
      {
        label: 'X',
        url: 'https://x.com/DeepTech_Ready',
      },
    ],
  },
  {
    name: 'DSN',
    description: 'Data Science Nigeria',
    website: 'https://datasciencenigeria.org/',
    socials: [
      {
        label: 'X',
        url: 'https://x.com/DataScienceNIG',
      },
      {
        label: 'Instagram',
        url: 'https://www.instagram.com/datasciencenigeria/',
      },
    ],
  },
];

function Footer() {
  return (
    <footer className="sleeqora-footer">
      <div className="sleeqora-footer-inner">
        {/* Brand section */}
        <div className="sleeqora-footer-brand">
          <a href="/" className="sleeqora-footer-logo">
            SLEEQORA
          </a>

          <p className="sleeqora-footer-tagline">
            Connect. Learn. Collaborate. Grow.
          </p>

          <p className="sleeqora-footer-description">
            A community platform for WesOnline 3MTT and mentorship learners.
            Share knowledge, collaborate on projects, and grow together.
          </p>
        </div>

        {/* Organization links */}
        <div className="sleeqora-footer-organizations">
          <h3>Our Community Partners</h3>

          <div className="sleeqora-footer-grid">
            {organizations.map((organization) => (
              <div
                className="sleeqora-footer-organization"
                key={organization.name}
              >
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sleeqora-footer-org-name"
                >
                  {organization.name}
                  <span aria-hidden="true"> ↗</span>
                </a>

                <p>{organization.description}</p>

                {organization.socials.length > 0 && (
                  <div className="sleeqora-footer-socials">
                    {organization.socials.map((social) => (
                      <a
                        href={social.url}
                        key={social.label}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${organization.name} on ${social.label}`}
                      >
                        {social.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Copyright base */}
      <div className="sleeqora-footer-bottom">
        <p>
          &copy; 2026 <strong>SLEEQORA</strong>. All rights reserved.
        </p>

        <p>Built for learning, connection and growth.</p>
      </div>

      <style>{`
        .sleeqora-footer {
          width: 100%;
          margin-top: auto;
          background: #1b5e20;
          color: #ffffff;
          font-family: inherit;
        }

        .sleeqora-footer-inner {
          max-width: 1250px;
          margin: 0 auto;
          padding: 38px 28px 30px;
          display: grid;
          grid-template-columns: minmax(220px, 0.85fr) minmax(0, 1.6fr);
          gap: 48px;
          box-sizing: border-box;
        }

        .sleeqora-footer-brand {
          max-width: 350px;
        }

        .sleeqora-footer-logo {
          display: inline-block;
          color: #ffffff;
          text-decoration: none;
          font-size: 1.65rem;
          font-weight: 800;
          letter-spacing: 3px;
        }

        .sleeqora-footer-tagline {
          margin: 12px 0 10px;
          color: #dcedc8;
          font-size: 0.95rem;
          font-weight: 600;
        }

        .sleeqora-footer-description {
          margin: 0;
          color: #e8f5e9;
          font-size: 0.9rem;
          line-height: 1.8;
        }

        .sleeqora-footer-organizations h3 {
          margin: 0 0 22px;
          color: #ffffff;
          font-size: 1rem;
          font-weight: 700;
        }

        .sleeqora-footer-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px 20px;
        }

        .sleeqora-footer-organization {
          min-width: 0;
        }

        .sleeqora-footer-org-name {
          color: #ffffff;
          text-decoration: none;
          font-size: 0.95rem;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .sleeqora-footer-org-name:hover,
        .sleeqora-footer-socials a:hover {
          color: #c8e6c9;
          text-decoration: underline;
        }

        .sleeqora-footer-organization p {
          margin: 7px 0 10px;
          color: #e8f5e9;
          font-size: 0.8rem;
          line-height: 1.5;
        }

        .sleeqora-footer-socials {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 12px;
        }

        .sleeqora-footer-socials a {
          color: #c8e6c9;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .sleeqora-footer-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.22);
          max-width: 1250px;
          margin: 0 auto;
          padding: 16px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px 20px;
          box-sizing: border-box;
        }

        .sleeqora-footer-bottom p {
          margin: 0;
          color: #e8f5e9;
          font-size: 0.8rem;
          line-height: 1.6;
        }

        .sleeqora-footer-bottom strong {
          color: #ffffff;
          letter-spacing: 1px;
        }

        @media (max-width: 800px) {
          .sleeqora-footer-inner {
            grid-template-columns: 1fr;
            gap: 30px;
            padding: 32px 22px 26px;
          }

          .sleeqora-footer-brand {
            max-width: 550px;
          }

          .sleeqora-footer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .sleeqora-footer-bottom {
            padding: 16px 22px;
          }
        }

        @media (max-width: 450px) {
          .sleeqora-footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 22px 14px;
          }

          .sleeqora-footer-logo {
            font-size: 1.4rem;
          }

          .sleeqora-footer-bottom {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </footer>
  );
}

export default Footer;