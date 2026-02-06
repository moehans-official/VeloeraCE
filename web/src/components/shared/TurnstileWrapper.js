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
import React from 'react';
import Turnstile from 'react-turnstile';

const TurnstileWrapper = ({ enabled, siteKey, onVerify }) => {
  if (!enabled) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: 20,
      }}
    >
      <Turnstile
        sitekey={siteKey}
        onVerify={onVerify}
      />
    </div>
  );
};

export default TurnstileWrapper;