import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react'; // <-- Import the magnifying glass icon
import { searchHospitalsAPI } from '../../services/api';
import styles from '../../pages/Landing/Landing.module.css';

const PatientSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length >= 2) {
        setIsSearching(true);
        try {
          const response = await searchHospitalsAPI(query);
          setResults(response.data.data || []);
        } catch (error) {
          console.error("Search failed:", error);
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelectHospital = (slug) => {
    navigate(`/h/${slug}`); 
  };

  return (
    <div className={styles.searchWrapper}>
      {/* Absolute positioned icon */}
      <div className={styles.searchIconWrapper}>
        <Search size={22} />
      </div>
      
      <input
        type="text"
        className={styles.searchInput}
        placeholder="Find your hospital (e.g., Karthik Netralaya)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      
      {(results.length > 0 || isSearching) && (
        <div className={styles.searchResults}>
          {isSearching ? (
            <div className={styles.searchItem} style={{ color: '#64748b' }}>
              Searching live database...
            </div>
          ) : (
            results.map((hospital) => (
              <div 
                key={hospital.id} 
                className={styles.searchItem}
                onClick={() => handleSelectHospital(hospital.slug)}
              >
                <strong style={{ color: '#0f172a', fontSize: '1.1rem', display: 'block', marginBottom: '0.25rem' }}>
                  {hospital.name}
                </strong>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {hospital.address || "Location unavailable"}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PatientSearch;