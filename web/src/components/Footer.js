/*
Copyright (c) 2025 Tethys Plex

This file is part of Veloera.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
import React, { useEffect, useState } from 'react';
import { getFooterHTML } from '../helpers';

const FooterBar = () => {
  const [footer, setFooter] = useState(getFooterHTML());
  const [poweredByText, setPoweredByText] = useState('Powered by VeloeraCE');
  let remainCheckTimes = 5;

  const poweredByTexts = [
    '由 VeloeraCE 驱动',
    'Powered by VeloeraCE',
    'Built on VeloeraCE',
    'Driven by VeloeraCE',
    'Made with love by VeloeraCE',
  ];

  const loadFooter = () => {
    const footerHTML = localStorage.getItem('footer_html');
    if (footerHTML) {
      setFooter(footerHTML);
    }
  };

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * poweredByTexts.length);
    setPoweredByText(poweredByTexts[randomIndex]);

    const timer = setInterval(() => {
      if (remainCheckTimes <= 0) {
        clearInterval(timer);
        return;
      }
      remainCheckTimes--;
      loadFooter();
    }, 200);
    return () => clearInterval(timer);
  }, []);

  const PoweredByLink = (
    <a
      href='https://github.com/moehans-official/VeloeraCE'
      target='_blank'
      rel='noreferrer'
      className='footer-powered-link'
      onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
      onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
    >
      {poweredByText}
    </a>
  );

  let content;
  if (footer) {
    content = (
      <div className='app-footer-content'>
        <div
          className='custom-footer app-footer-custom'
          dangerouslySetInnerHTML={{ __html: footer }}
        ></div>
        <div className='app-footer-powered'>{PoweredByLink}</div>
      </div>
    );
  } else {
    content = <div className='app-footer-content app-footer-content-empty'>{PoweredByLink}</div>;
  }

  return <div className='app-footer-shell'>{content}</div>;
};

export default FooterBar;
